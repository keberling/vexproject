/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.sharepoint.com',
      },
      {
        protocol: 'https',
        hostname: '**.microsoft.com',
      },
    ],
  },
}

module.exports = nextConfig

