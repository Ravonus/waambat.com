import { notFound, permanentRedirect } from "next/navigation";
import ContentPage from "~/app/components/ContentPage";
import Gallery from "~/app/components/Gallery";
import LegacySplash from "~/app/components/LegacySplash";
import { getPublishedContent } from "~/server/content";
import { requirePreviewAccess } from "~/server/preview-access";
import { publicForm } from "~/lib/forms";
import { pageDescription, pageMetadata } from "~/lib/seo";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requirePreviewAccess();
  const { slug } = await params;
  if (slug === "nfts-copy") permanentRedirect("/");
  const content = await getPublishedContent();
  const page = content.pages.find((p) => p.slug === slug && !p.archived);
  if (!page)
    return { title: "Page not found", robots: { index: false, follow: false } };
  return pageMetadata(
    `/${slug}`,
    page.seo.title || page.title,
    pageDescription(page),
    page.seo.image || undefined,
    page.seo.noIndex || ["splash", "split-splash"].includes(page.layout),
  );
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requirePreviewAccess();
  const { slug } = await params;
  if (slug === "nfts-copy") permanentRedirect("/");
  const content = await getPublishedContent();
  const page = content.pages.find((p) => p.slug === slug && !p.archived);
  if (!page) notFound();
  if (["splash", "split-splash"].includes(page.layout))
    return <LegacySplash page={page} theme={content.theme} />;
  return (
    <>
      <ContentPage
        page={page}
        forms={content.forms
          .filter((form) => form.enabled && form.page === slug)
          .map(publicForm)}
      />
      <Gallery content={content} page={slug} />
    </>
  );
}
