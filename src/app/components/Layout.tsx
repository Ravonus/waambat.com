import Header from "./Header";
import Footer from "./Footer";
import { getPublishedContent } from "~/server/content";
import type { Content } from "~/lib/content";
import { themeStyle, type Theme } from "~/lib/theme";
export default async function Layout({
  children,
  preview = false,
  navigation,
  wide = false,
  theme,
}: {
  children: React.ReactNode;
  preview?: boolean;
  navigation?: Content["navigation"];
  wide?: boolean;
  theme?: Theme;
}) {
  const awaitContent = await getPublishedContent();
  return (
    <div
      className="site-theme flex min-h-screen flex-col"
      style={themeStyle(theme ?? awaitContent.theme)}
    >
      <Header
        preview={preview}
        navigation={(navigation ?? awaitContent.navigation).filter(
          (entry) =>
            navigation ||
            !entry.href.startsWith("/") ||
            !awaitContent.pages.find((p) => `/${p.slug}` === entry.href)
              ?.archived,
        )}
      />
      <main
        id="main-content"
        className={`site-main mx-auto w-full flex-grow ${wide ? "site-main-wide" : ""}`}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
