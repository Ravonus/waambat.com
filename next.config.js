import "./src/env.js";
/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  env: {
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
