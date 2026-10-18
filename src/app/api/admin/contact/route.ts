import { z } from "zod";
import { requireAdmin, checkOrigin } from "~/server/auth";
import { readBody } from "~/server/body";
import { apiError } from "~/server/http";
import {
  ContactError,
  contactInbox,
  updateSubmission,
  withContactStore,
} from "~/server/contact";
import { emailReadiness } from "~/server/mail";
import { getPublishedContent } from "~/server/content";
const key = z.string().regex(/^submissions\/\d{13}-[a-f0-9-]{36}$/);
function contactError(error: unknown) {
  return error instanceof ContactError
    ? Response.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      )
    : apiError(error);
}
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const after = z
      .union([z.literal(""), key])
      .parse(new URL(request.url).searchParams.get("after") ?? "");
    const [inbox, content] = await Promise.all([
      withContactStore((store) => contactInbox(store, after)),
      getPublishedContent(),
    ]);
    return Response.json(
      { ...inbox, email: emailReadiness(content.email) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return contactError(error);
  }
}
export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    checkOrigin(request);
    const change = z
      .object({ key, archived: z.boolean() })
      .strict()
      .parse(JSON.parse((await readBody(request, 2000)).toString("utf8")));
    await withContactStore((store) =>
      updateSubmission(store, change.key, { archived: change.archived }),
    );
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return contactError(error);
  }
}
