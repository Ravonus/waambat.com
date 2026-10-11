import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "~/server/auth";
import { getContentState } from "~/server/content";
import Layout from "~/app/components/Layout";
import Gallery from "~/app/components/Gallery";
import ContentPage from "~/app/components/ContentPage";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Private draft preview",
  robots: { index: false, follow: false },
};
export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin");
  }
  const state = await getContentState();
  const page = (await searchParams).page ?? "nfts";
  const article = state.draft.pages.find((p) => p.slug === page);
  return (
    <Layout
      preview
      navigation={state.draft.navigation.filter(
        (n) =>
          !state.draft.pages.find((p) => `/${p.slug}` === n.href)?.archived,
      )}
    >
      <div className="border-waambat-pink mb-8 border p-4 text-center">
        <strong>Private draft · commit {state.revision.slice(0, 12)}</strong>
        <p>
          This is the saved draft. Public visitors still see the published
          version.
        </p>
        <Link href="/admin">Return to studio</Link> ·{" "}
        <Link href="/admin/preview?page=nfts">NFTs</Link> ·{" "}
        <Link href="/admin/preview?page=ordinals">Ordinals</Link>
      </div>
      {article ? (
        <>
          <ContentPage page={article} />
          <Gallery content={state.draft} page={page} />
        </>
      ) : (
        <Gallery
          content={state.draft}
          page={page === "ordinals" ? "ordinals" : "nfts"}
        />
      )}
    </Layout>
  );
}
