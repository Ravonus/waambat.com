import { getStore } from "@netlify/blobs";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { localTestConfigured } from "./git-store";
import { AdminError } from "./auth";
interface MediaMetadata extends Record<string, unknown> {
  name: string;
  type: string;
  size: number;
  actor: string;
}
export function mediaConfigured() {
  return (
    (localTestConfigured() && !!process.env.CMS_LOCAL_MEDIA) ||
    process.env.NETLIFY_MEDIA_ENABLED === "1"
  );
}
function localFolder() {
  return localTestConfigured() ? process.env.CMS_LOCAL_MEDIA : undefined;
}
function store() {
  if (process.env.NETLIFY_MEDIA_ENABLED !== "1")
    throw new AdminError(
      503,
      "Uploads are disabled. Use approved existing media URLs, or enable the approved Netlify media store.",
    );
  // Site-wide, so uploaded originals survive Git-triggered deploys. Platform credentials remain server-side.
  return getStore({ name: "waambat-media", consistency: "strong" });
}
export async function saveMedia(
  id: string,
  data: Buffer,
  metadata: MediaMetadata,
) {
  const folder = localFolder();
  if (folder) {
    await mkdir(folder, { recursive: true });
    try {
      await writeFile(join(folder, id), data, { flag: "wx" });
      await writeFile(join(folder, `${id}.json`), JSON.stringify(metadata), {
        flag: "wx",
      });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
    return;
  }
  await store().set(id, new Uint8Array(data), { metadata, onlyIfNew: true });
}
export async function readMedia(id: string) {
  const folder = localFolder();
  if (folder) {
    try {
      return {
        data: await readFile(join(folder, id)),
        metadata: JSON.parse(
          await readFile(join(folder, `${id}.json`), "utf8"),
        ) as MediaMetadata,
      };
    } catch {
      return null;
    }
  }
  const entry = await store().getWithMetadata(id, { type: "arrayBuffer" });
  return entry
    ? {
        data: Buffer.from(entry.data),
        metadata: entry.metadata as unknown as MediaMetadata,
      }
    : null;
}
