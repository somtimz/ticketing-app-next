/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000']
    }
  },
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;
