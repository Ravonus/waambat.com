import { isPrivateSite } from "~/server/preview-access";
import { readMedia } from "~/server/media-store";
import { getPublishedContent } from "~/server/content";
import { requireAdmin } from "~/server/auth";
import { mediaReferences } from "~/lib/content";
import { parseRange } from "~/lib/uploads";
export const dynamic = "force-dynamic";
async function serve(
  request: Request,
  context: { params: Promise<{ id: string }> },
  head = false,
) {
  const { id } = await context.params;
  if (!/^[a-f0-9]{64}$/.test(id)) return new Response(null, { status: 404 });
  try {
    if (isPrivateSite()) {
      try {
        await requireAdmin();
      } catch {
        return new Response(null, { status: 404 });
      }
    }
    const published = mediaReferences(await getPublishedContent()).has(
      `/api/media/${id}`,
    );
    if (!published) {
      try {
        await requireAdmin();
      } catch {
        return new Response(null, { status: 404 });
      }
    }
    const entry = await readMedia(id);
    if (!entry) return new Response(null, { status: 404 });
    const row = entry.metadata;
    const range = parseRange(request.headers.get("range"), row.size);
    if (!range)
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${row.size}` },
      });
    const headers: Record<string, string> = {
      "Content-Type": row.type,
      "Content-Length": String(range.end - range.start + 1),
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      ETag: `"${id}"`,
    };
    if (range.partial)
      headers["Content-Range"] =
        `bytes ${range.start}-${range.end}/${row.size}`;
    const data = head ? null : entry.data.subarray(range.start, range.end + 1);
    return new Response(data ? new Uint8Array(data) : null, {
      status: range.partial ? 206 : 200,
      headers,
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
export const GET = (r: Request, c: { params: Promise<{ id: string }> }) =>
  serve(r, c);
export const HEAD = (r: Request, c: { params: Promise<{ id: string }> }) =>
  serve(r, c, true);
