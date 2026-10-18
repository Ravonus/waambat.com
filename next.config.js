import "./src/env.js";
/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  env: {
    WAAMBAT_DEPLOY_CONTEXT: process.env.CONTEXT ?? "production",
    WAAMBAT_BUILD_REVISION: process.env.COMMIT_REF ?? "local-working-tree",
    WAAMBAT_REVIEW_BUILD: process.env.WAAMBAT_PRIVATE_SITE === "1" ? "1" : "0",
    WAAMBAT_CONTENT_CONTEXT:
      process.env.CONTEXT === "deploy-preview"
        ? `review-${process.env.REVIEW_ID ?? "1"}`
        : "production",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // Ordinals preview loops carry a hash of their bytes in the file name, so a
        // new render is a new URL and the old one can be kept forever.
        source: "/previews/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Hero renders keep their file names when re-rendered, so cache for an
        // hour and revalidate in the background instead of marking them immutable.
        source: "/hero/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/streams/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/paintings/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/social/cards/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default config;
