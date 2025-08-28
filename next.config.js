/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization for Core Web Vitals
  images: {
    domains: ["i.scdn.co", "image-cdn-ak.spotifycdn.com", "fasho.co", "www.fasho.co"],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year cache
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Compression for better performance
  compress: true,
  
  // Performance optimizations
  experimental: {
    scrollRestoration: true,
  },
  
  // Security and Performance Headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security Headers
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
      {
        // Performance headers for static assets
        source: '/(_next/static|favicon.ico|robots.txt|sitemap.xml)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Blog-specific caching
        source: '/blog/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        // RSS Feed caching
        source: '/api/blog/rss.xml',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/rss+xml; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Sitemap caching
        source: '/api/blog/sitemap.xml',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/xml; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
  
  // SEO-friendly redirects
  async redirects() {
    return [
      // RSS feed discovery
      {
        source: '/rss',
        destination: '/api/blog/rss.xml',
        permanent: true,
      },
      {
        source: '/feed',
        destination: '/api/blog/rss.xml',
        permanent: true,
      },
      {
        source: '/rss.xml',
        destination: '/api/blog/rss.xml',
        permanent: true,
      },
      // Sitemap discovery
      {
        source: '/sitemap',
        destination: '/api/blog/sitemap.xml',
        permanent: true,
      },
    ];
  },
  
  // Rewrites for better SEO URLs
  async rewrites() {
    return [
      // RSS and sitemap rewrites for better SEO discovery
      {
        source: '/blog/rss.xml',
        destination: '/api/blog/rss.xml',
      },
      {
        source: '/blog/sitemap.xml',
        destination: '/api/blog/sitemap.xml',
      },
    ];
  },
};

module.exports = nextConfig; 