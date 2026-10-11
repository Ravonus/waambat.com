import { notFound } from "next/navigation";
import Layout from "~/app/components/Layout";
import ContentPage from "~/app/components/ContentPage";
import { getPublishedContent } from "~/server/content";
import { requirePreviewAccess } from "~/server/preview-access";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requirePreviewAccess();
  const { slug } = await params;
  const page = (await getPublishedContent()).pages.find((p) => p.slug === slug);
  return { title: page?.title ?? "Page not found" };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requirePreviewAccess();
  const { slug } = await params;
  const page = (await getPublishedContent()).pages.find((p) => p.slug === slug);
  if (!page) notFound();
  return (
    <Layout>
      <ContentPage page={page} />
    </Layout>
  );
}
