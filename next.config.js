// next.config.js
const nextConfig = {
  // Remove output: 'export'
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  }
};