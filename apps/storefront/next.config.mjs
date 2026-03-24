import { spawnSync } from "node:child_process";
import withSerwistInit from "@serwist/next";

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ||
  "https://earth-revibeapi-production.up.railway.app";

const revision = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() || crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cache client-side navigation data so back/forward never re-fetches.
  // This is the fix for iOS Safari blink — without this, dynamic pages
  // (useSearchParams) have staleTimes.dynamic = 0 meaning every
  // navigation re-fetches the RSC payload from the server.
  experimental: {
    staleTimes: {
      dynamic: 300,  // cache dynamic pages for 5 min — no background revalidation blink
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

export default withSerwist(nextConfig);
