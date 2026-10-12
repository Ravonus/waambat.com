import "~/styles/globals.css";
import OriginalFonts from "./components/OriginalFonts";
import RouteEffects from "./components/RouteEffects";
import type { Metadata } from "next";
import { adobeProjectURL } from "~/lib/adobe-project";
export const metadata: Metadata = {
  title: { default: "waambat", template: "%s — waambat" },
  description: "Video paintings and Ordinals by WAAMBAT · Lindsay Scoggins",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adobeProject = adobeProjectURL(process.env.WAAMBAT_ADOBE_PROJECT_URL);
  const originalFonts =
    !adobeProject && process.env.WAAMBAT_ORIGINAL_FONTS !== "0";
  return (
    <html lang="en">
      <head>
        {adobeProject && <link rel="stylesheet" href={adobeProject} />}
        {originalFonts && (
          // eslint-disable-next-line @next/next/no-css-tags -- Conditional original hosted font-face; no font binary self-hosting.
          <link rel="stylesheet" href="/original-fonts.css" />
        )}
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-5 focus:z-50"
        >
          Skip to artwork
        </a>
        <OriginalFonts enabled={originalFonts} />
        <RouteEffects />
        {children}
      </body>
    </html>
  );
}
