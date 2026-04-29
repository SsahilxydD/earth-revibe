/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ['@earth-revibe/shared'],
  // Allow the LAN IP so the dev server's HMR works when testing on a phone
  // over Wi-Fi. Next 16 blocks cross-origin dev requests by default.
  allowedDevOrigins: ['10.75.121.130'],
};

export default nextConfig;
