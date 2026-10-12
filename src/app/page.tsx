import { requirePreviewAccess } from "~/server/preview-access";
import Layout from "./components/Layout";
import Gallery from "./components/Gallery";
import Hero from "./components/Hero";
import { getPublishedContent } from "~/server/content";
import { activeHero } from "~/lib/hero";
export const dynamic = "force-dynamic";
export default async function Home() {
  await requirePreviewAccess();
  const content = await getPublishedContent();
  const hero = activeHero(content, "nfts");
  return (
    <Layout hero={hero && <Hero section={hero.section} item={hero.item} />}>
      <Gallery content={content} page="nfts" />
    </Layout>
  );
}
