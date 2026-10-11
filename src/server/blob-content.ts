import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { contentSchema, type Content } from "~/lib/content";
import { removedContent } from "~/lib/content-change";
import { serializeContent } from "./git-store";
import { AdminError } from "./auth";
const revision = z.string().regex(/^[a-f0-9]{40}$/);
const snapshot = z
  .object({
    draft: contentSchema,
    published: contentSchema,
    revision,
    publishedRevision: revision,
  })
  .strict();
type Snapshot = z.infer<typeof snapshot>;
export const blobContentConfigured = () =>
  process.env.CMS_CONTENT_PROVIDER === "netlify-blobs";
function store() {
  const context = process.env.WAAMBAT_CONTENT_CONTEXT ?? "production";
  const name = process.env.CMS_CONTENT_STORE ?? `waambat-content-${context}`;
  if (!/^waambat-content-[a-z0-9-]{1,80}$/.test(name))
    throw new AdminError(503, "Content store configuration is invalid");
  return getStore({ name, consistency: "strong" });
}
function initial(seed: Content): Snapshot {
  return {
    draft: seed,
    published: seed,
    revision: "0".repeat(40),
    publishedRevision: "0".repeat(40),
  };
}
async function read(seed: Content) {
  const found = await store().getWithMetadata("state", { type: "json" });
  if (found && !found.etag)
    throw new AdminError(503, "Content revision is unavailable");
  return {
    state: found ? snapshot.parse(found.data) : initial(seed),
    etag: found?.etag,
  };
}
export async function readBlobContent(seed: Content) {
  return (await read(seed)).state;
}
export async function updateBlobContent(
  seed: Content,
  expected: string,
  action: "save" | "publish",
  candidate: Content | undefined,
  actor: string,
  expectedPublished?: string,
) {
  const { state, etag } = await read(seed);
  if (
    state.revision !== expected ||
    (action === "publish" && state.publishedRevision !== expectedPublished)
  )
    throw new AdminError(
      409,
      "A newer version exists. Reload before saving; your edits remain on screen.",
    );
  const next = structuredClone(state);
  if (action === "save") {
    const content = contentSchema.parse(candidate);
    const removed = removedContent(state.draft, content);
    if (removed.length)
      throw new AdminError(
        400,
        `Archive content instead of removing or renaming it: ${removed.slice(0, 5).join(", ")}`,
      );
    serializeContent(content);
    next.draft = content;
    next.revision = randomBytes(20).toString("hex");
  } else {
    next.published = next.draft;
    next.publishedRevision = next.revision;
  }
  const historyId = randomBytes(20).toString("hex");
  await store().setJSON(
    `history/${historyId}`,
    { ...next, actor, action, at: new Date().toISOString() },
    { onlyIfNew: true },
  );
  const result = await store().setJSON(
    "state",
    next,
    etag ? { onlyIfMatch: etag } : { onlyIfNew: true },
  );
  if (!result.modified)
    throw new AdminError(
      409,
      "Another editor saved first. Reload to reconcile your draft.",
    );
  return next;
}
