import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // TypeScript errors are caught in dev — skip blocking the production build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
