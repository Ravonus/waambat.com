import { ZodError } from "zod";
import { FormValidationError } from "~/lib/forms";
import { getPublishedContent } from "~/server/content";
import { readBody } from "~/server/body";
import {
  ContactError,
  contactSource,
  receiveContact,
  withContactStore,
} from "~/server/contact";
import { AdminError } from "~/server/auth";
import { contactOriginAllowed } from "~/lib/contact-origin";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    if (!contactOriginAllowed(request))
      throw new ContactError(403, "Please submit from this website.");
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new ContactError(415, "Send JSON form data.");
    let input: unknown;
    try {
      input = JSON.parse((await readBody(request, 64000)).toString("utf8"));
    } catch (error) {
      if (error instanceof AdminError) throw error;
      throw new ContactError(400, "The form response could not be read.");
    }
    const content = await getPublishedContent();
    const result = await withContactStore((store) =>
      receiveContact(content, input, contactSource(request), store),
    );
    return Response.json(result, { headers });
  } catch (error) {
    if (error instanceof FormValidationError)
      return Response.json(
        { error: error.message, fields: error.fields },
        { status: 400, headers },
      );
    if (error instanceof ContactError || error instanceof AdminError)
      return Response.json(
        { error: error.message },
        { status: error.status, headers },
      );
    if (error instanceof ZodError)
      return Response.json(
        {
          error:
            "Please check your answers and reload if the form has changed.",
        },
        { status: 400, headers },
      );
    return Response.json(
      {
        error:
          "Your message could not be confirmed. Your answers are still here; please try again shortly.",
      },
      { status: 503, headers },
    );
  }
}
