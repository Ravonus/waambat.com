import { ZodError } from "zod";
import { AdminError } from "./auth";
export function apiError(error: unknown) {
  if (error instanceof AdminError)
    return Response.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  if (error instanceof ZodError)
    return Response.json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      { status: 400 },
    );
  console.error(
    "Admin operation failed",
    error instanceof Error ? error.message : "Unknown error",
  );
  return Response.json(
    {
      error:
        "The Git or media service is unavailable. Your edits remain here; reload before retrying if a request was interrupted.",
    },
    { status: 503 },
  );
}
