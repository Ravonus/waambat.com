// Keep this policy specific to the site's real media, fonts, embeds and GA4 stream.
export const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'nonce-{kerf}' 'strict-dynamic' 'self' https://www.googletagmanager.com",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline' https://use.typekit.net https://p.typekit.net",
  "img-src 'self' https: data: blob:",
  "font-src 'self' https://use.typekit.net data:",
  "media-src 'self' blob: https://i.imgur.com https://i.vimeocdn.com https://vod-progressive.akamaized.net",
  "connect-src 'self' https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google.com https://www.googletagmanager.com https://use.typekit.net https://p.typekit.net",
  "frame-src https://www.youtube-nocookie.com https://player.vimeo.com https://www.instagram.com https://ordinals.com https://www.googletagmanager.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "require-trusted-types-for 'script'",
  "trusted-types kerf-html waambat-analytics goog#html",
  "upgrade-insecure-requests",
].join('; ');

/** GA4's only permitted script URL; other runtime script strings remain blocked. */
export function analyticsScriptURL(id: string): string {
  const url = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  if (!/^G-[A-Z0-9]{6,20}$/.test(id)) throw new TypeError('Invalid Google Analytics ID');
  const factory = (globalThis as typeof globalThis & {trustedTypes?: {
    createPolicy(name: string, rules: {createScriptURL(value: string): string}): {createScriptURL(value: string): unknown};
  }}).trustedTypes;
  if (!factory) return url;
  analyticsPolicy ??= factory.createPolicy('waambat-analytics', {createScriptURL(value) {
    if (!/^https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-[A-Z0-9]{6,20}$/.test(value))
      throw new TypeError('Unexpected analytics script');
    return value;
  }});
  return analyticsPolicy.createScriptURL(url) as string;
}
let analyticsPolicy: {createScriptURL(value: string): unknown} | undefined;
