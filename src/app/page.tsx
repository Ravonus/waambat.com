import { requirePreviewAccess } from "~/server/preview-access";
import Layout from "./components/Layout";
import Gallery from "./components/Gallery";
import { getPublishedContent } from "~/server/content";
export const dynamic = "force-dynamic";
export default async function Home() {
  await requirePreviewAccess();
  return (
    <Layout>
      <Gallery content={await getPublishedContent()} page="nfts" />
    </Layout>
  );
}
