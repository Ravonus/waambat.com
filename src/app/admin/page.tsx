import { authConfigured, requireAdmin, signIn, signOut } from "~/server/auth";
import { getContentState } from "~/server/content";
import Editor from "./Editor";
import Link from "next/link";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Content studio",
  robots: { index: false, follow: false },
};
export default async function Admin() {
  let authorized = false;
  try {
    await requireAdmin();
    authorized = true;
  } catch {}
  if (!authorized)
    return (
      <main id="main-content" className="mx-auto max-w-xl p-8 pt-20">
        <Link href="/" className="text-waambat-logo">
          waambat
        </Link>
        <h1 className="text-waambat-pink mt-6 text-3xl">Content studio</h1>
        <p className="my-6">
          Manage artwork, sections and videos. Saved drafts stay private until
          you publish.
        </p>
        {authConfigured() ? (
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/admin" });
            }}
          >
            <button className="border-waambat-pink rounded border px-5 py-2">
              Sign in with GitHub
            </button>
            <p className="mt-3">Only approved WAAMBAT accounts can enter.</p>
          </form>
        ) : (
          <p role="status">
            Admin is disabled until authorized sign-in and storage are
            configured. Contact the site maintainer to enable access.
          </p>
        )}
      </main>
    );
  const state = await getContentState().catch(() => null);
  if (state) {
    return (
      <main id="main-content" className="mx-auto max-w-6xl p-5 md:p-10">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-waambat-logo text-xl">
            waambat / content studio
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin" });
            }}
          >
            <button>Sign out</button>
          </form>
        </div>
        <Editor initial={state} />
      </main>
    );
  }
  return (
    <main id="main-content" className="p-10">
      <h1>Storage is unavailable</h1>
      <p>
        Configure the approved GitHub App and content branches before editing.
      </p>
    </main>
  );
}
