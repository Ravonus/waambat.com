import { readBody } from "~/server/body";
import { createHash } from "node:crypto";

import { requireAdmin, checkOrigin, AdminError } from "~/server/auth";
import { saveMedia, mediaConfigured } from "~/server/media-store";
import { apiError } from "~/server/http";
import { detectMedia, MAX_UPLOAD } from "~/lib/uploads";
export async function POST(request: Request) {
  try {
    const actor = await requireAdmin();
    checkOrigin(request);
    if (!mediaConfigured())
      throw new AdminError(
        503,
        "Uploads are disabled until an approved media store is configured. Use existing hosted media URLs.",
      );
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
      throw new AdminError(415, "Choose an image or video file");
    const bytes = await readBody(request, MAX_UPLOAD + 65536);
    let form: FormData;
    try {
      form = await new Response(bytes, {
        headers: { "content-type": request.headers.get("content-type")! },
      }).formData();
    } catch {
      throw new AdminError(
        400,
        "Upload could not be read. Choose the file again.",
      );
    }
    const file = form.get("file");
    if (!(file instanceof File)) throw new AdminError(400, "Choose a file");
    if (!file.size || file.size > MAX_UPLOAD)
      throw new AdminError(413, "Choose a file between 1 byte and 4 MB");
    const data = Buffer.from(await file.arrayBuffer());
    const type = detectMedia(data);
    if (!type || type !== file.type)
      throw new AdminError(
        415,
        "File content does not match a supported PNG, JPEG, WebP, GIF, MP4 or WebM",
      );
    const id = createHash("sha256").update(data).digest("hex");
    const name = file.name.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 160);
    await saveMedia(id, data, { name, type, size: data.length, actor });
    return Response.json(
      { url: `/api/media/${id}`, type, size: data.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
