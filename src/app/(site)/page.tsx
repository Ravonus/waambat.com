import { requirePreviewAccess } from "~/server/preview-access";
import Gallery from "~/app/components/Gallery";
import PageTransition from "~/app/components/navigation/PageTransition";
import { getPublishedContent } from "~/server/content";
import { pageMetadata } from "~/lib/seo";
import {artistGraph} from "~/lib/site-settings";
export const dynamic = "force-dynamic";
export async function generateMetadata(){await requirePreviewAccess();const content=await getPublishedContent();return {...pageMetadata('/',content.seo.homeTitle,content.seo.description,undefined,false,content),title:{absolute:content.seo.homeTitle},verification:content.integrations.googleSiteVerification?{google:content.integrations.googleSiteVerification}:undefined};}
export default async function Home() {
  await requirePreviewAccess();
  const content = await getPublishedContent();
  return (
    <PageTransition routeKey="/">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(artistGraph(content)).replace(/</g, "\\u003c"),
        }}
      />
      <Gallery content={content} page="nfts" />
    </PageTransition>
  );
}
