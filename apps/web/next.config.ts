import type { NextConfig } from "next";

const publicMetadataCacheControl =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    imageSizes: [16, 32, 48, 64, 96, 128, 160, 192, 256, 320, 384],
    qualities: [60, 75],
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
      {
        source: "/:path(robots\\.txt|sitemap\\.xml|icon\\.svg|opengraph-image)",
        headers: [{ key: "Cache-Control", value: publicMetadataCacheControl }],
      },
      {
        source: "/vendor/jsquash-avif/:version/:path*",
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
