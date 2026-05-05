const API_ORIGIN = 'https://earth-revibeapi-production.up.railway.app';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ['@earth-revibe/shared', '@earth-revibe/ui'],
  // Proxy API requests through Vercel to avoid CORS preflight failures.
  // Client-side fetches go to Railway directly and would hit CORS otherwise.
  // This rewrite keeps them same-origin.
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_ORIGIN}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
