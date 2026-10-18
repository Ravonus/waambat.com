import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "~/server/auth";
import { getContentState } from "~/server/content";
import Layout from "~/app/components/Layout";
import Gallery from "~/app/components/Gallery";
import ContentPage from "~/app/components/ContentPage";
import LegacySplash from "~/app/components/LegacySplash";
import Hero from "~/app/components/Hero";
import { activeHero } from "~/lib/hero";
import { publicForm } from "~/lib/forms";
import PageTransition from "~/app/components/navigation/PageTransition";
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
  if (article && ["splash", "split-splash"].includes(article.layout))
    return (
      <>
        <div className="fixed top-0 left-0 z-50 bg-black p-2">
          <Link href="/admin">Private draft · Return to studio</Link>
        </div>
        <LegacySplash page={article} theme={state.draft.theme} />
      </>
    );
  const hero = article ? null : activeHero(state.draft, page);
  return (
    <Layout
      preview
      hero={hero && <Hero section={hero.section} item={hero.item} preview />}
      theme={state.draft.theme}
      wide={article?.layout === "archive" || (!article && page === "ordinals")}
      navigation={state.draft.navigation.filter(
        (n) =>
          !state.draft.pages.find((p) => `/${p.slug}` === n.href)?.archived,
      )}
    >
      <PageTransition key={page} routeKey={`preview:${page}`}>
        <div className="border-waambat-pink mb-8 border p-4 text-center">
          <strong>
            Private draft · revision {state.revision.slice(0, 12)}
          </strong>
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
            <ContentPage
              page={article}
              forms={state.draft.forms
                .filter((form) => form.enabled && form.page === page)
                .map(publicForm)}
              preview
            />
            <Gallery content={state.draft} page={page} />
          </>
        ) : (
          <Gallery
            content={state.draft}
            page={page === "ordinals" ? "ordinals" : "nfts"}
          />
        )}
      </PageTransition>
    </Layout>
  );
}
