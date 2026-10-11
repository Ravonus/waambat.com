import { contentSchema, type Content } from "~/lib/content";
import stored from "~/content/site.json";
import {
  getGitStore,
  draftBranch,
  baseBranch,
  localTestConfigured,
} from "./git-store";
import { AdminError } from "./auth";
export interface ContentState {
  revision: string;
  draft: Content;
  published: Content;
  publishedRevision: string;
  deployedRevision: string;
  updatedAt: null;
}
export async function getContentState(): Promise<ContentState> {
  const store = getGitStore();
  const published = await store.read(baseBranch());
  if (!published)
    throw new AdminError(
      503,
      "The configured production content branch does not exist",
    );
  const draft = (await store.read(draftBranch())) ?? published;
  return {
    revision: draft.sha,
    draft: draft.content,
    published: published.content,
    publishedRevision: published.sha,
    deployedRevision: process.env.COMMIT_REF ?? "local-working-tree",
    updatedAt: null,
  };
}
export async function getPublishedContent(): Promise<Content> {
  if (localTestConfigured())
    return (await getGitStore().read(baseBranch()))!.content;
  // Netlify builds exactly the JSON in the commit being deployed. No runtime Git token is needed for public artwork.
  return contentSchema.parse(stored);
}
export async function updateContent(
  revision: string,
  action: "save" | "publish",
  content: Content | undefined,
  actor: string,
  publishedRevision?: string,
) {
  const store = getGitStore();
  const state = await getContentState();
  if (state.revision !== revision)
    throw new AdminError(
      409,
      "A newer version exists. Reload before saving; your edits remain on screen.",
    );
  if (action === "save") {
    await store.createBranch(draftBranch(), state.publishedRevision);
    await store.commit(
      draftBranch(),
      revision,
      contentSchema.parse(content),
      `content: save WAAMBAT draft (GitHub user ${actor})`,
    );
  } else {
    if (!publishedRevision || state.publishedRevision !== publishedRevision)
      throw new AdminError(
        409,
        "The production branch changed. Reload before publishing.",
      );
    await store.commit(
      baseBranch(),
      publishedRevision,
      state.draft,
      `content: publish WAAMBAT draft ${revision.slice(0, 12)} (GitHub user ${actor})`,
    );
  }
  return getContentState();
}
