import { withSentryConfig } from '@sentry/nextjs';

const API_ORIGIN = 'https://earth-revibeapi-production.up.railway.app';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ['@earth-revibe/shared', '@earth-revibe/ui'],
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
      // Homepage editor previews: built-in default cards reference Unsplash
      // and storefront-relative paths (resolved against the prod domain).
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'www.earthrevibe.com',
      },
      {
        protocol: 'https',
        hostname: 'earthrevibe.com',
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
  // Pages that have moved to apps/crm. 301 sends bookmarks + cached search
  // results to the new home. NEXT_PUBLIC_CRM_URL is set in Vercel; the
  // fallback covers local dev so nothing breaks if a developer hasn't set it.
  async redirects() {
    const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || 'https://earth-revibe-crm.vercel.app';
    return [
      {
        source: '/abandoned-carts',
        destination: `${CRM_URL}/abandoned-carts`,
        permanent: true,
      },
      {
        source: '/abandoned-carts/:path*',
        destination: `${CRM_URL}/abandoned-carts/:path*`,
        permanent: true,
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
