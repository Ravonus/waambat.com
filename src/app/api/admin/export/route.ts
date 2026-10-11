import { requireAdmin } from "~/server/auth";
import { getContentState } from "~/server/content";
import { apiError } from "~/server/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireAdmin();
    return Response.json(await getContentState(), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition":
          'attachment; filename="waambat-content-backup.json"',
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
