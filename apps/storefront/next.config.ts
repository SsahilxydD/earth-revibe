import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
  },
};

export default nextConfig;
