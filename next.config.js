/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use static exports for better performance and hosting flexibility
  output: 'export',

  // Strict mode for catching potential issues
  reactStrictMode: true,

  // Optimize production builds
  productionBrowserSourceMaps: false,

  // Disable server components since we're using client-side state management
  experimental: {
    serverComponents: false,
  },

  // Optimize builds
  swcMinify: true,

  // Configure image optimization
  images: {
    unoptimized: true, // Since we're using static export
    minimumCacheTTL: 60,
  },

  // Configure compiler options
  compiler: {
    // Remove console.logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    
    // Enable legacyBrowsers for better compatibility
    legacyBrowsers: false,
  },

  // Optimize build performance
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Handle ESLint errors in development, disable in production for performance
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
    dirs: ['pages', 'components', 'lib', 'src', 'app']
  },

  // Enable compression
  compress: true,

  // Asset prefix for CDN support (if needed)
  // assetPrefix: process.env.NEXT_PUBLIC_CDN_URL,

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

    // Optimize bundle size in production
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: {
          name: 'runtime',
        },
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          minChunks: 1,
          cacheGroups: {
            vendor: {
              name: 'vendor',
              test: /[\\/]node_modules[\\/]/,
              chunks: 'all',
              priority: -10
            },
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true
            }
          }
        }
      };
    }

    return config;
  },

  // Enable more detailed logging in production
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'error' : 'info',
  },
};

module.exports = nextConfig;