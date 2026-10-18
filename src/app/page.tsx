import { requirePreviewAccess } from "~/server/preview-access";
import Layout from "./components/Layout";
import Gallery from "./components/Gallery";
import Hero from "./components/Hero";
import { getPublishedContent } from "~/server/content";
import { activeHero } from "~/lib/hero";
import { siteOrigin } from "~/lib/seo";
export const dynamic = "force-dynamic";
export default async function Home() {
  await requirePreviewAccess();
  const content = await getPublishedContent();
  const hero = activeHero(content, "nfts");
  return (
    <Layout hero={hero && <Hero section={hero.section} item={hero.item} />}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Person",
                "@id": `${siteOrigin}/#artist`,
                name: "Lindsay Scoggins",
                alternateName: "WAAMBAT",
                url: siteOrigin,
                sameAs: [
                  "https://www.instagram.com/waambat",
                  "https://www.youtube.com/waambat",
                  "https://foundation.app/waambat",
                ],
              },
              {
                "@type": "WebSite",
                "@id": `${siteOrigin}/#website`,
                name: "WAAMBAT",
                url: siteOrigin,
                creator: { "@id": `${siteOrigin}/#artist` },
              },
            ],
          }).replace(/</g, "\\u003c"),
        }}
      />
      <Gallery content={content} page="nfts" />
    </Layout>
  );
}
