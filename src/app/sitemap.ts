import type { MetadataRoute } from "next";
import { getPublishedContent } from "~/server/content";
import { indexableSite, publicPaths, siteOrigin } from "~/lib/seo";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!indexableSite()) return [];
  return publicPaths(await getPublishedContent()).map((path) => ({
    url: new URL(path, siteOrigin).href,
  }));
}
