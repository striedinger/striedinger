import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@workspace/icons", "@workspace/i18n", "@workspace/ui"],
  experimental: {
    serverActions: {
      bodySizeLimit: "16kb",
    },
  },
};

export default nextConfig;
