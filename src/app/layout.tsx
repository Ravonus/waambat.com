import "~/styles/globals.css";
import type { Metadata } from "next";
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
  return (
    <html lang="en">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-5 focus:z-50"
        >
          Skip to artwork
        </a>
        {children}
      </body>
    </html>
  );
}
