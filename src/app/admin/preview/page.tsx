import { redirect } from "next/navigation";
import { requireAdmin } from "~/server/auth";
import { getContentState } from "~/server/content";
import Layout from "~/app/components/Layout";
import Gallery from "~/app/components/Gallery";
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
  const page = (await searchParams).page === "ordinals" ? "ordinals" : "nfts";
  return (
    <Layout>
      <div className="border-waambat-pink mb-8 border p-4 text-center">
        <strong>Private draft · commit {state.revision.slice(0, 12)}</strong>
        <p>
          This is the saved draft. Public visitors still see the published
          version.
        </p>
        <a href="/admin">Return to studio</a> ·{" "}
        <a href="/admin/preview?page=nfts">NFTs</a> ·{" "}
        <a href="/admin/preview?page=ordinals">Ordinals</a>
      </div>
      <Gallery content={state.draft} page={page} />
    </Layout>
  );
}
