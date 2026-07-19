import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.mzstatic.com" }],
  },
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/vendor/qpdf-run/0.2.1/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  transpilePackages: ["@workspace/icons", "@workspace/i18n", "@workspace/ui"],
  experimental: {
    viewTransition: true,
    serverActions: {
      bodySizeLimit: "16kb",
    },
  },
};

export default nextConfig;
