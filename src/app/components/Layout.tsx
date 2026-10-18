import Footer from "./Footer";
import SiteFrame from "./navigation/SiteFrame";
import { getPublishedContent } from "~/server/content";
import type { Content } from "~/lib/content";
import { themeStyle, type Theme } from "~/lib/theme";
export default async function Layout({
  children,
  preview = false,
  navigation,
  wide = false,
  theme,
  hero,
}: {
  children: React.ReactNode;
  preview?: boolean;
  navigation?: Content["navigation"];
  wide?: boolean;
  theme?: Theme;
  hero?: React.ReactNode;
}) {
  const awaitContent = await getPublishedContent();
  const active = theme ?? awaitContent.theme;
  return (
    <SiteFrame
      hero={hero}
      preview={preview}
      navigation={(navigation ?? awaitContent.navigation).filter(
        (entry) =>
          navigation ||
          !entry.href.startsWith("/") ||
          !awaitContent.pages.find((p) => `/${p.slug}` === entry.href)
            ?.archived,
      )}
      wide={wide}
      style={themeStyle(active)}
      motion={active.motion}
      footer={<Footer />}
    >
      {children}
    </SiteFrame>
  );
}
