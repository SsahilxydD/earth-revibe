const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ||
  "https://earth-revibeapi-production.up.railway.app";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cache client-side navigation data so back/forward never re-fetches.
  // This is the fix for iOS Safari blink — without this, dynamic pages
  // (useSearchParams) have staleTimes.dynamic = 0 meaning every
  // navigation re-fetches the RSC payload from the server.
  experimental: {
    staleTimes: {
      dynamic: 60,   // cache dynamic pages for 60s client-side
      static: 300,   // cache static pages for 5 min client-side
    },
  },
  transpilePackages: ["@earth-revibe/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imagedelivery.net",
      },
      {
        protocol: "https",
        hostname: "*.imagedelivery.net",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
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
        source: "/api/v1/:path*",
        destination: `${API_ORIGIN}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
