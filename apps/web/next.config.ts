import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@search-hub/schemas', '@search-hub/sdk'],
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
