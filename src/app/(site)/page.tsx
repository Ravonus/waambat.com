import { requirePreviewAccess } from "~/server/preview-access";
import Gallery from "~/app/components/Gallery";
import { getPublishedContent } from "~/server/content";
import { siteOrigin } from "~/lib/seo";
export const dynamic = "force-dynamic";
export default async function Home() {
  await requirePreviewAccess();
  const content = await getPublishedContent();
  return (
    <>
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
    </>
  );
}
