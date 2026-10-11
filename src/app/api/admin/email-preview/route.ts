import { requireAdmin, checkOrigin } from "~/server/auth";
import { getContentState } from "~/server/content";
import { captureEmail, emailReadiness } from "~/server/mail";
import { apiError } from "~/server/http";
export async function POST(request: Request) {
  try {
    await requireAdmin();
    checkOrigin(request);
    const state = await getContentState();
    const mime = await captureEmail(state.draft.email, {
      to: "capture@example.invalid",
      subject: "WAAMBAT email configuration preview",
      text: "This is an isolated email capture. No message was delivered.",
    });
    return Response.json(
      {
        captured: true,
        delivered: false,
        mime,
        readiness: emailReadiness(state.draft.email),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
