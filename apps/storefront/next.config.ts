import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@earth-revibe/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
      },
    ],
  },
};

export default nextConfig;
