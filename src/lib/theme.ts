import { z } from "zod";
import type { CSSProperties } from "react";
const color = (value: string) =>
  z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default(value);
const number = (value: number, min: number, max: number) =>
  z.number().min(min).max(max).default(value);
export const themeSchema = z
  .object({
    background: color("#000000"),
    body: color("#ebebeb"),
    heading: color("#e1bcc2"),
    logo: color("#ff94b2"),
    link: color("#9457ff"),
    linkHover: color("#ff7070"),
    navigation: color("#9c9c9c"),
    activeNavigation: color("#ffffff"),
    navigationHover: color("#fa75d0"),
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
  })
  .strict();
export type Theme = z.infer<typeof themeSchema>;
export const originalTheme = themeSchema.parse({});
const fonts = {
  original: '"Europa", "Helvetica Neue", Helvetica, Arial, sans-serif',
  system: "system-ui, sans-serif",
  serif: "Georgia, serif",
  monospace: "ui-monospace, monospace",
};
export function themeStyle(theme: Theme): CSSProperties {
  const vars: Record<string, string | number> = {
    "--site-background": theme.background,
    "--site-body": theme.body,
    "--color-waambat-pink": theme.heading,
    "--color-waambat-logo": theme.logo,
    "--color-waambat-link": theme.link,
    "--color-waambat-link-hover": theme.linkHover,
    "--color-waambat-hover": theme.navigationHover,
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
