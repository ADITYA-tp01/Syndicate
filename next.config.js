/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // The falkordb Node client pulls in @js-temporal/polyfill, which throws
  // "e.BigInt is not a function" when webpack bundles it. Load it from
  // node_modules at runtime instead.
  experimental: {
    serverComponentsExternalPackages: ['falkordb'],
  },
};

module.exports = nextConfig;