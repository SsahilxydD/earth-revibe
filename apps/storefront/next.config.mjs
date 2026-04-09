import { spawnSync } from 'node:child_process';
import { withSentryConfig } from '@sentry/nextjs';
import withSerwistInit from '@serwist/next';

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ||
  'https://earth-revibeapi-production.up.railway.app';

const revision =
  spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() ||
  crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  additionalPrecacheEntries: [{ url: '/~offline', revision }],
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip lint + typecheck during Vercel builds — they run in CI already.
  // Saves ~30-60s per build which adds up fast on the free tier.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // Cache client-side navigation data so back/forward never re-fetches.
  // This is the fix for iOS Safari blink — without this, dynamic pages
  // (useSearchParams) have staleTimes.dynamic = 0 meaning every
  // navigation re-fetches the RSC payload from the server.
  experimental: {
    staleTimes: {
      dynamic: 300, // cache dynamic pages for 5 min — no background revalidation blink
      static: 300, // cache static pages for 5 min client-side
    },
  },
  transpilePackages: ['@earth-revibe/shared'],
  images: {
    // Vercel's built-in image optimization — works great now that uploads
    // are auto-compressed to <1MB WebP by the API. Serves AVIF/WebP at
    // exact responsive sizes with aggressive CDN caching.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
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
        hostname: 'cdn.shopify.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Proxy API requests through Vercel so mobile browsers never call Railway
  // directly. Indian mobile carriers (Jio, Airtel) have DNS/routing issues
  // reaching Railway servers, which breaks product loading on cellular data.
  // With this rewrite, the browser only talks to Vercel (India edge nodes).
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_ORIGIN}/api/v1/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/collections/all',
        destination: '/products',
        permanent: true,
      },
      {
        source: '/collections/:slug',
        destination: '/categories/:slug',
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(withSerwist(nextConfig), {
  org: 'earthrevibe',
  project: 'storefront',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  disableLogger: true,
  automaticVercelMonitors: true,
});
