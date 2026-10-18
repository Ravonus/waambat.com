import { requirePreviewAccess } from "~/server/preview-access";
import Layout from "../components/Layout";
import Gallery from "../components/Gallery";
import { getPublishedContent } from "~/server/content";
import { pageMetadata } from "~/lib/seo";
export const metadata = pageMetadata(
  "/ordinals",
  "Ordinals",
  "Explore WAAMBAT’s LUX, Kismet Twist, Edge Corporeal, and early Ordinals inscriptions.",
);
export const dynamic = "force-dynamic";
export default async function Ordinals() {
  await requirePreviewAccess();
  return (
    <Layout wide>
      <Gallery content={await getPublishedContent()} page="ordinals" />
    </Layout>
  );
}
