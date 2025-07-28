/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["i.scdn.co", "image-cdn-ak.spotifycdn.com"],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Redirect any non-existent paths to our custom error page
      // This will only apply after 404 page handling
    ];
  },
};

module.exports = nextConfig; 