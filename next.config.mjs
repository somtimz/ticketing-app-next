/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable ESLint in worktree (conflicts with parent .eslintrc.json)
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000']
    }
  }
};

export default nextConfig;
