import { readBody } from "~/server/body";
import { requireAdmin, checkOrigin, AdminError } from "~/server/auth";
import { getContentState, updateContent } from "~/server/content";
import { apiError } from "~/server/http";
import { saveSchema } from "~/lib/content";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireAdmin();
    return Response.json(await getContentState(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await requireAdmin();
    checkOrigin(request);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new AdminError(415, "Send JSON content");
    const body = (await readBody(request, 500000)).toString("utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new AdminError(400, "Invalid JSON");
    }
    const { revision, action, content, publishedRevision } =
      saveSchema.parse(parsed);
    if (action === "save" && !content)
      throw new AdminError(400, "Content is required");
    return Response.json(
      await updateContent(revision, action, content, actor, publishedRevision),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
