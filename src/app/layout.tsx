import "~/styles/globals.css";
import "~/styles/navigation.css";
import RouteEffects from "./components/RouteEffects";
import NavigationProvider from "./components/navigation/NavigationProvider";
import type { Metadata } from "next";
import { adobeProjectURL } from "~/lib/adobe-project";
import { pageMetadata, siteOrigin, siteDescription } from "~/lib/seo";
export const metadata: Metadata = {
  ...pageMetadata("/", "Video paintings & Ordinals", siteDescription),
  metadataBase: new URL(siteOrigin),
  title: { default: "waambat", template: "%s — waambat" },
  authors: [{ name: "Lindsay Scoggins", url: `${siteOrigin}/bio-waambat` }],
  creator: "WAAMBAT",
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
        {(adobeProject || originalFonts) && (
          <link
            rel="preconnect"
            href="https://use.typekit.net"
            crossOrigin="anonymous"
          />
        )}
        {adobeProject && <link rel="stylesheet" href={adobeProject} />}
        {originalFonts && (
          // Keep the exact Adobe-hosted face while removing a blocking stylesheet request.
          <style>{`@font-face{font-family:"amboy-inline";font-style:normal;font-weight:400;font-display:swap;src:url("https://use.typekit.net/af/f4c430/00000000000000007735b4f5/31/l?subset_id=2&fvd=n4&v=3") format("woff2")}`}</style>
        )}
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-5 focus:z-50"
        >
          Skip to artwork
        </a>
        <NavigationProvider>
          <RouteEffects />
          {children}
        </NavigationProvider>
      </body>
    </html>
  );
}
