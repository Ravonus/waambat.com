import type { ReactNode } from "react";
import { getPublishedContent } from "~/server/content";
import { requirePreviewAccess } from "~/server/preview-access";
import { themeStyle } from "~/lib/theme";
import { activeHero } from "~/lib/hero";
import type { PageRoute } from "~/lib/navigation";
import Hero from "~/app/components/Hero";
import Footer from "~/app/components/Footer";
import SiteFrame from "~/app/components/navigation/SiteFrame";

// This layout survives public page swaps: the header, menu and footer no
// longer remount while the destination streams into its loading boundary.
export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePreviewAccess();
  const content = await getPublishedContent();
  const hero = activeHero(content, "nfts");
  const routes: PageRoute[] = [
    { href: "/", label: "NFTs", kind: "gallery" },
    { href: "/ordinals", label: "ORDINALS", kind: "ordinals", wide: true },
    ...content.pages
      .filter((page) => !page.archived)
      .map(
        (page): PageRoute => ({
          href: `/${page.slug}`,
          label: page.title,
          kind:
            page.layout === "archive"
              ? "archive"
              : page.layout === "contact" || page.slug === "contact-waambat"
                ? "contact"
                : page.layout === "gallery"
                  ? "gallery"
                  : "article",
          wide: page.layout === "archive",
          splash: ["splash", "split-splash"].includes(page.layout),
        }),
      ),
  ];
  return (
    <SiteFrame
      navigation={content.navigation.filter(
        (entry) =>
          !entry.archived &&
          (!entry.href.startsWith("/") ||
            !content.pages.find((page) => `/${page.slug}` === entry.href)
              ?.archived),
      )}
      style={themeStyle(content.theme)}
      motion={content.theme.motion}
      routes={routes}
      hero={hero && <Hero section={hero.section} item={hero.item} />}
      footer={<Footer />}
    >
      {children}
    </SiteFrame>
  );
}
