/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove static export since we need API routes
  // output: 'export', 

  // Strict mode for catching potential issues
  reactStrictMode: true,

  // Optimize production builds
  productionBrowserSourceMaps: false,

  // Configure image optimization
  images: {
    domains: [], // Add your image domains if needed
    minimumCacheTTL: 60,
  },

  // Configure compiler options
  compiler: {
    // Remove console.logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Handle ESLint errors in development, disable in production for performance
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },

  // Enable compression
  compress: true,

  // Customize webpack config
  webpack: (config, { dev, isServer }) => {
    // Optimize CSV imports
    config.module.rules.push({
      test: /\.csv$/,
      loader: 'csv-loader',
      options: {
        dynamicTyping: true,
        header: true,
        skipEmptyLines: true
      }
    });

    return config;
  },
};

module.exports = nextConfig;