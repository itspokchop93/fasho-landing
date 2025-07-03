/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["i.scdn.co", "image-cdn-ak.spotifycdn.com"],
  },
  async headers() {
    return [
      {
        source: '/iframe-communicator.html',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
          }
        ]
      }
    ];
  },
};

module.exports = nextConfig; 