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
function store(fetcher?: typeof fetch) {
  const context = process.env.WAAMBAT_CONTENT_CONTEXT ?? "production";
  const name = process.env.CMS_CONTENT_STORE ?? `waambat-content-${context}`;
  if (!/^waambat-content-[a-z0-9-]{1,80}$/.test(name))
    throw new AdminError(503, "Content store configuration is invalid");
  return getStore({ name, consistency: "strong", fetch: fetcher });
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
  // The SDK retries transport errors and 5xx responses five times with 5s
  // delays. Bound the entire read, including response-body consumption, so
  // a storage outage cannot hold public rendering until the platform times out.
  const controller = new AbortController();
  let expired = false;
  let providerStatus: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const fetcher: typeof fetch = async (input, options) => {
    if (controller.signal.aborted) return new Response(null, { status: 408 });
    try {
      const response = await fetch(input, {
        ...options,
        // Opt out of Next's response cloning as well as owning the deadline.
        // The SDK awaits body.cancel() for 404/errors; a retained memoization
        // clone can keep that cancellation pending forever, even for a 404.
        signal: controller.signal,
      });
      providerStatus = response.status;
      return response;
    } catch (error) {
      // A nonretryable response also stops the SDK's retry loop after abort.
      if (controller.signal.aborted) return new Response(null, { status: 408 });
      throw error;
    }
  };
  try {
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        expired = true;
        controller.abort();
        reject(new AdminError(503, "Content storage read timed out"));
      }, 2500);
    });
    const operation = async () => {
      const found = await store(fetcher).getWithMetadata("state", {
        type: "json",
      });
      if (found && !found.etag)
        throw new AdminError(503, "Content revision is unavailable");
      return {
        state: found ? snapshot.parse(found.data) : initial(seed),
        etag: found?.etag,
      };
    };
    return await Promise.race([operation(), deadline]);
  } catch (error) {
    // Never log platform credentials, storage URLs or the draft document.
    const status =
      typeof error === "object" && error && "status" in error
        ? error.status
        : undefined;
    console.error("WAAMBAT content storage read failed", {
      reason: expired ? "deadline" : "provider-error",
      status: !expired && typeof status === "number" ? status : providerStatus,
      category:
        error instanceof Error &&
        [
          "MissingBlobsEnvironmentError",
          "BlobsConsistencyError",
          "BlobsInternalError",
          "ZodError",
        ].includes(error.name)
          ? error.name
          : undefined,
    });
    throw new AdminError(
      503,
      "Content storage is temporarily unavailable. Your edits are preserved; try again shortly.",
    );
  } finally {
    clearTimeout(timer);
  }
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
