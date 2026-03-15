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
    ],
  },
};

export default nextConfig;
