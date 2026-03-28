import { withSentryConfig } from '@sentry/nextjs';

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ||
  'https://earth-revibeapi-production.up.railway.app';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@earth-revibe/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'imagedelivery.net',
      },
      {
        protocol: 'https',
        hostname: '*.imagedelivery.net',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // Proxy API requests through Vercel to avoid CORS preflight failures.
  // Client-side fetches (dashboard analytics, notifications) go to Railway
  // directly and hit CORS. This rewrite keeps them same-origin.
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_ORIGIN}/api/v1/:path*`,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: 'earthrevibe',
  project: 'admin',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  disableLogger: true,
  automaticVercelMonitors: true,
});
