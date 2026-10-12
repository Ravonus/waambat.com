// The account owner supplies Adobe's public web-project embed URL.
// Accept the hosted stylesheet form; never copy font binaries or arbitrary CSS.
export function adobeProjectURL(value: string | undefined): string | undefined {
  return value && /^https:\/\/use\.typekit\.net\/[a-z0-9]{7}\.css$/.test(value)
    ? value
    : undefined;
}
