import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  reactCompiler: true,
  transpilePackages: ["@workspace/icons", "@workspace/i18n", "@workspace/ui"],
  experimental: {
    viewTransition: true,
    serverActions: {
      bodySizeLimit: "16kb",
    },
  },
};

export default nextConfig;
