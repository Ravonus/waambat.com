import { requirePreviewAccess } from "~/server/preview-access";
import Gallery from "~/app/components/Gallery";
import { getPublishedContent } from "~/server/content";
import { pageMetadata } from "~/lib/seo";
import PageTransition from "~/app/components/navigation/PageTransition";
export const metadata = pageMetadata(
  "/ordinals",
  "Ordinals",
  "Explore WAAMBAT’s LUX, Kismet Twist, Edge Corporeal, and early Ordinals inscriptions.",
);
export const dynamic = "force-dynamic";
export default async function Ordinals() {
  await requirePreviewAccess();
  return (
    <PageTransition routeKey="/ordinals">
      <Gallery content={await getPublishedContent()} page="ordinals" />
    </PageTransition>
  );
}
