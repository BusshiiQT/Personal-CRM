import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Don’t fail Vercel builds because of lint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Don’t fail Vercel builds because of TS type errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
