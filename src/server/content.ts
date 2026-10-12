import { contentSchema, type Content } from "~/lib/content";
import stored from "~/content/site.json";
import { cache } from "react";
import { correctLegacyOrdinalSources } from "~/lib/ordinal-sources";
import { addDefaultHero } from "~/lib/hero";
import { removedContent } from "~/lib/content-change";
import {
  getGitStore,
  draftBranch,
  baseBranch,
  localTestConfigured,
  serializeContent,
} from "./git-store";
import { AdminError } from "./auth";
import {
  blobContentConfigured,
  readBlobContent,
  updateBlobContent,
} from "./blob-content";
const seed = () => contentSchema.parse(stored);
export interface ContentState {
  revision: string;
  draft: Content;
  published: Content;
  publishedRevision: string;
  deployedRevision: string;
  updatedAt: null;
  sourceCorrectionsPending?: boolean;
  heroPending?: boolean;
}
// Stored documents predate some defaults; present them current without writing.
function present(content: Content) {
  const sources = correctLegacyOrdinalSources(content);
  const hero = addDefaultHero(sources.content);
  return {
    content: hero.content,
    sourcesChanged: sources.changed,
    heroChanged: hero.changed,
  };
}
function presentState(state: ContentState): ContentState {
  const draft = present(state.draft);
  const published = present(state.published);
  return {
    ...state,
    draft: draft.content,
    published: published.content,
    sourceCorrectionsPending: draft.sourcesChanged,
    heroPending: draft.heroChanged,
  };
}
export async function getContentState(): Promise<ContentState> {
  if (blobContentConfigured())
    return presentState({
      ...(await readBlobContent(seed())),
      deployedRevision:
        process.env.WAAMBAT_BUILD_REVISION ?? "local-working-tree",
      updatedAt: null,
    });
  const store = getGitStore();
  const published = await store.read(baseBranch());
  if (!published)
    throw new AdminError(
      503,
      "The configured production content branch does not exist",
    );
  const draft = (await store.read(draftBranch())) ?? published;
  return presentState({
    revision: draft.sha,
    draft: draft.content,
    published: published.content,
    publishedRevision: published.sha,
    deployedRevision:
      process.env.WAAMBAT_BUILD_REVISION ?? "local-working-tree",
    updatedAt: null,
  });
}
// Metadata, page and layout share one validated published snapshot per render.
// This does not cache drafts or carry a snapshot across requests/publishes.
export const getPublishedContent = cache(async (): Promise<Content> => {
  if (blobContentConfigured())
    return present((await readBlobContent(seed())).published).content;
  if (localTestConfigured())
    return present((await getGitStore().read(baseBranch()))!.content).content;
  // Netlify builds exactly the JSON in the commit being deployed. No runtime Git token is needed for public artwork.
  return contentSchema.parse(stored);
});
export async function updateContent(
  revision: string,
  action: "save" | "publish",
  content: Content | undefined,
  actor: string,
  publishedRevision?: string,
) {
  if (blobContentConfigured()) {
    await updateBlobContent(
      seed(),
      revision,
      action,
      content,
      actor,
      publishedRevision,
    );
    return getContentState();
  }
  const store = getGitStore();
  const state = await getContentState();
  if (state.revision !== revision)
    throw new AdminError(
      409,
      "A newer version exists. Reload before saving; your edits remain on screen.",
    );
  if (action === "save") {
    const candidate = contentSchema.parse(content);
    const removed = removedContent(state.draft, candidate);
    if (removed.length)
      throw new AdminError(
        400,
        `Archive content instead of removing or renaming it: ${removed.slice(0, 5).join(", ")}`,
      );
    serializeContent(candidate);
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
