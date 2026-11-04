import type { NextConfig } from "next";

const publicMetadataCacheControl =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

// Limits what a page can embed, be embedded by, and submit to, without restricting scripts:
// a script policy would need a per-request nonce, which would make prerendered pages dynamic.
function createContentSecurityPolicy(frameAncestors: string) {
  return [
    `frame-ancestors ${frameAncestors}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

// Reported, not enforced: browsers send what this stricter policy would block to /csp-report,
// which shows whether it could be enforced (with per-request nonces in place of 'unsafe-inline').
const reportOnlyContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  // Speech models download from Hugging Face; Drop signals through Nostr relays over wss.
  "connect-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co wss:",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "require-trusted-types-for 'script'",
  "report-uri /csp-report",
  "report-to csp",
].join("; ");

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    imageSizes: [16, 32, 48, 64, 96, 128, 160, 192, 256, 320, 384],
    qualities: [60, 75],
    remotePatterns: [
      { protocol: "https", hostname: "**.mzstatic.com" },
      { protocol: "https", hostname: "i.scdn.co" },
    ],
  },
  poweredByHeader: false,
  reactCompiler: true,
  // oxlint-disable-next-line typescript/require-await -- NextConfig requires headers to return a Promise
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: createContentSecurityPolicy("'none'") },
          { key: "Content-Security-Policy-Report-Only", value: reportOnlyContentSecurityPolicy },
          { key: "Reporting-Endpoints", value: 'csp="/csp-report"' },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        // X shows the Now Playing card as a player, which embeds this page in a frame.
        source: "/:locale(es|de|it|fr|pt|zh|ja)?/listening",
        headers: [
          {
            key: "Content-Security-Policy",
            value: createContentSecurityPolicy(
              "https://x.com https://*.x.com https://twitter.com https://*.twitter.com",
            ),
          },
        ],
      },
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
        source:
          "/:path(robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|icon\\.svg|opengraph-image)",
        headers: [{ key: "Cache-Control", value: publicMetadataCacheControl }],
      },
      {
        source: "/:path*/opengraph-image",
        headers: [{ key: "Cache-Control", value: publicMetadataCacheControl }],
      },
      {
        // The listening card shows the current song, so the edge keeps it for seconds rather
        // than a day. Listed after the general rule above, so this value wins.
        source: "/:locale(es|de|it|fr|pt|zh|ja)?/listening/opengraph-image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=30, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/vendor/pdfjs-dist/:version/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/vendor/onnxruntime-web/:version/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Workers started from the cross-origin isolated video editor must opt in as well.
        source: "/_next/static/chunks/:path*",
        headers: [{ key: "Cross-Origin-Embedder-Policy", value: "credentialless" }],
      },
      {
        // Cross-origin isolation lets the speech model use every CPU core through shared
        // memory. `credentialless` keeps cross-origin downloads, such as the model, working.
        source: "/:locale(es|de|it|fr|pt|zh|ja)?/video",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
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
      {
        // The worker is this app's own code, which can change without a new codec version.
        source: "/vendor/jsquash-avif/:version/worker.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
  transpilePackages: ["@workspace/icons", "@workspace/i18n", "@workspace/ui"],
  // The build script type-checks with tsrs first and stops on any error, so Next skips its own check.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
