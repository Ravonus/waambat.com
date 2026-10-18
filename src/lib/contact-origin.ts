// Netlify may construct the function Request URL with its canonical host rather
// than the browser's custom/preview host. Bind public submissions to this site's
// exact deployment origins; this does not change administrator authentication.
export function contactOriginAllowed(
  request: Request,
  context = process.env.WAAMBAT_CONTENT_CONTEXT ?? "production",
) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const preview = /^review-([1-9]\d{0,8})$/.exec(context);
  const allowed = preview
    ? [`https://deploy-preview-${preview[1]}--waambat.netlify.app`]
    : context === "production"
      ? [
          "https://waamb.at",
          "https://www.waamb.at",
          "https://waambat.netlify.app",
        ]
      : [];
  if (allowed.includes(origin)) return true;
  const url = new URL(request.url);
  return (
    process.env.NODE_ENV !== "production" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
    origin === url.origin
  );
}
