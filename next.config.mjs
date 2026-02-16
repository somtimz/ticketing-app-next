/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.vercel.app']
    }
  },
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;
