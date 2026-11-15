import { z } from "zod3";
type CSSProperties = Record<string, string | number | undefined>;
const color = (value: string) =>
  z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default(value);
// A colour that may be left unset, in which case it is derived (see themeColors).
const derivedColor = () =>
  z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional();
const number = (value: number, min: number, max: number) =>
  z.number().min(min).max(max).default(value);

/* One interactive accent family. Shades move along OKLCH lightness at the base
   hue, so hover and pressed never leave the family; surfaces and borders are the
   base mixed over the page background. See accentFamily() below. */
const linear = (v: number) =>
  v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
const gamma = (v: number) =>
  v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
const channels = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
const toHex = (rgb: number[]) =>
  "#" +
  rgb
    .map((v) =>
      Math.round(Math.min(1, Math.max(0, v)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
function toOklch(hex: string): [number, number, number] {
  const [r, g, b] = channels(hex).map(linear) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(a, bb), Math.atan2(bb, a)];
}
/** OKLCH to sRGB hex, reducing chroma until the colour is in gamut. */
function fromOklch(L: number, C: number, h: number) {
  const lightness = Math.min(1, Math.max(0, L));
  for (let c = C; c > 0; c -= 0.002) {
    const a = c * Math.cos(h), b = c * Math.sin(h);
    const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const rgb = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
    if (rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4))
      return toHex(rgb.map((v) => gamma(Math.max(0, v))));
  }
  const grey = gamma(lightness ** 3);
  return toHex([grey, grey, grey]);
}
const mix = (top: string, under: string, amount: number) => {
  const a = channels(top), b = channels(under);
  return toHex(a.map((v, i) => v * amount + b[i]! * (1 - amount)));
};
export function luminance(hex: string) {
  const [r, g, b] = channels(hex).map(linear) as [number, number, number];
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}
export function contrast(a: string, b: string) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
/** The pale pastel pink is the canonical interactive accent. */
export const canonicalAccent = "#e1bcc2";
/** The wordmark pink: the logo, titles and the cursor. */
export const wordmarkPink = "#ff94b2";
export function accentFamily(base: string, background = "#000000") {
  const [L, C, h] = toOklch(base);
  const ink = fromOklch(0.2, Math.min(C, 0.03), h);
  return {
    base,
    hover: fromOklch(Math.min(0.97, L + 0.06), C * 0.85, h),
    pressed: fromOklch(L - 0.1, C * 1.1, h),
    focus: base,
    border: mix(base, background, 0.5),
    surface: mix(base, background, 0.08),
    surfaceStrong: mix(base, background, 0.14),
    disabled: mix(base, background, 0.4),
    // The family's own dark ink on light accents; otherwise the clearer of black or white.
    onAccent:
      contrast(ink, base) >= 4.5
        ? ink
        : contrast("#000000", base) >= contrast("#ffffff", base)
          ? "#000000"
          : "#ffffff",
  };
}
/** Semantic error. Never the only signal: invalid fields also carry text. */
export const dangerColor = "#ff7070";
/* Exact defaults earlier releases seeded into stored themes. A theme saved
   before accentVersion 2 existed that still holds one of these exact values
   takes the new default instead; any other colour is kept. Version-2 themes are
   never migrated, so an admin may deliberately choose one of these values again.
   No other stored setting is touched. */
const legacyDefaults = {
  heading: "#e1bcc2",
  link: "#9457ff",
  linkHover: "#ff7070",
  navigationHover: "#fa75d0",
} as const;
export const accentVersion = 2;
function migrateLegacyAccent(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  if ((value as Record<string, unknown>).accentVersion !== undefined) return value;
  const next: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  for (const [key, legacy] of Object.entries(legacyDefaults))
    if (typeof next[key] === "string" && (next[key] as string).toLowerCase() === legacy)
      delete next[key];
  return next;
}
const themeObject = z
  .object({
    background: color("#000000"),
    body: color("#ebebeb"),
    heading: color(wordmarkPink),
    logo: color(wordmarkPink),
    // The interactive accent family's base. Its hover shade is derived from it
    // unless set explicitly.
    link: color(canonicalAccent),
    linkHover: derivedColor(),
    navigation: color("#9c9c9c"),
    activeNavigation: color("#ffffff"),
    // Navigation hover follows the wordmark colour unless set explicitly, so it
    // never reads as the white current page.
    navigationHover: derivedColor(),
    font: z
      .enum(["original", "system", "serif", "monospace"])
      .default("original"),
    brandFont: z
      .enum(["original", "system", "serif", "monospace"])
      .default("original"),
    bodySize: number(14, 12, 24),
    bodyWeight: number(300, 300, 700),
    lineHeight: number(1.8, 1.2, 2.4),
    tracking: number(0.04, 0, 0.2),
    headingSize: number(26, 18, 48),
    smallHeadingSize: number(14, 12, 28),
    logoSize: number(37, 24, 64),
    navigationSize: number(14, 12, 24),
    contentWidth: number(960, 640, 1440),
    desktopPadding: number(60, 20, 100),
    mobilePadding: number(20, 12, 40),
    headerTop: number(60, 20, 100),
    headerBottom: number(60, 20, 100),
    pageGap: number(45, 0, 100),
    blockPadding: number(17, 0, 40),
    paragraphGap: number(14, 0, 40),
    archiveGap: number(10, 4, 24),
    // Reveal and transition energy. The visitor's reduced-motion setting always wins.
    motion: z.enum(["full", "calm", "off"]).default("full"),
    // Size of the live wordmark inside the hero banner, as a percentage.
    heroWordmarkScale: number(100, 60, 160),
    // Marks a theme as already on the pastel accent model (see migrateLegacyAccent).
    // Any whole version from 2 on is kept; anything else (a rollback's null, a typo)
    // reads as 2 instead of failing the whole content store.
    accentVersion: z.number().int().min(accentVersion).catch(accentVersion).default(accentVersion),
  })
  .strict();
export const themeSchema = z.preprocess(migrateLegacyAccent, themeObject);
export type Theme = z.infer<typeof themeSchema>;
export const originalTheme = themeSchema.parse({});
const fonts = {
  original: '"Europa", "Helvetica Neue", Helvetica, Arial, sans-serif',
  system: "system-ui, sans-serif",
  serif: "Georgia, serif",
  monospace: "ui-monospace, monospace",
};
function actionText(background: string) {
  return contrast("#000000", background) >= contrast("#ffffff", background)
    ? "#000000"
    : "#ffffff";
}
/** The effective hover colours: explicit when set, otherwise derived. */
export function themeColors(theme: Theme) {
  return {
    linkHover:
      theme.linkHover ?? accentFamily(theme.link, theme.background).hover,
    navigationHover: theme.navigationHover ?? theme.logo,
  };
}
export function themeStyle(theme: Theme): CSSProperties {
  const accent = accentFamily(theme.link, theme.background);
  const { linkHover, navigationHover } = themeColors(theme);
  // The cursor follows the wordmark, in the same lighter/deeper steps.
  const cursor = accentFamily(theme.logo, theme.background);
  const vars: Record<string, string | number> = {
    "--ui-accent": accent.base,
    "--ui-accent-hover": linkHover,
    "--ui-accent-nav-hover": navigationHover,
    "--ui-accent-pressed": accent.pressed,
    "--ui-accent-focus": accent.focus,
    "--ui-accent-border": accent.border,
    "--ui-accent-surface": accent.surface,
    "--ui-accent-surface-strong": accent.surfaceStrong,
    "--ui-accent-disabled": accent.disabled,
    "--ui-on-accent": accent.onAccent,
    "--ui-on-accent-hover":
      contrast(accent.onAccent, linkHover) >= 4.5
        ? accent.onAccent
        : actionText(linkHover),
    "--ui-danger": dangerColor,
    "--ui-cursor": cursor.base,
    "--ui-cursor-light": cursor.hover,
    "--ui-cursor-deep": cursor.pressed,
    "--site-background": theme.background,
    "--site-body": theme.body,
    "--color-waambat-pink": theme.heading,
    "--color-waambat-logo": theme.logo,
    // Tailwind's text-waambat-link utility reads this alias of the accent.
    "--color-waambat-link": accent.base,
    "--site-navigation": theme.navigation,
    "--site-active-navigation": theme.activeNavigation,
    "--font-sans": fonts[theme.font],
    "--font-brand":
      theme.brandFont === "original"
        ? '"amboy-inline", ' + fonts.original
        : fonts[theme.brandFont],
    "--site-body-size": `${theme.bodySize}px`,
    "--site-weight": theme.bodyWeight,
    "--site-leading": theme.lineHeight,
    "--site-tracking": `${theme.tracking}em`,
    "--site-hero-wordmark-scale": theme.heroWordmarkScale / 100,
  };
  for (const key of [
    "headingSize",
    "smallHeadingSize",
    "logoSize",
    "navigationSize",
    "contentWidth",
    "desktopPadding",
    "mobilePadding",
    "headerTop",
    "headerBottom",
    "pageGap",
    "blockPadding",
    "paragraphGap",
    "archiveGap",
  ] as const)
    vars[`--site-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`] =
      `${theme[key]}px`;
  return vars as CSSProperties;
}
