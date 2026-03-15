/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

export default nextConfig;
