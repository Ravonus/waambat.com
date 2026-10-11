import { contentSchema } from "./content";
import type { ContentState } from "~/server/content";
export class AdminRequestError extends Error {
  constructor(
    message: string,
    public uncertain: boolean,
  ) {
    super(message);
  }
}
export async function requestContentState(
  init: RequestInit = {},
  timeout = 25000,
): Promise<ContentState> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch("/api/admin/content", {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
    const body = (await response.json()) as ContentState & { error?: string };
    if (!response.ok)
      throw new AdminRequestError(
        body.error ?? "Request failed",
        response.status >= 500,
      );
    if (
      ![body.revision, body.publishedRevision].every(
        (s) => typeof s === "string" && /^[a-f0-9]{40}$/.test(s),
      )
    )
      throw new Error("Invalid remote revision");
    return {
      ...body,
      draft: contentSchema.parse(body.draft),
      published: contentSchema.parse(body.published),
    };
  } catch (error) {
    if (error instanceof AdminRequestError) throw error;
    throw new AdminRequestError(
      controller.signal.aborted
        ? "The request timed out; its commit may still have completed."
        : "The connection ended before the commit could be confirmed.",
      true,
    );
  } finally {
    clearTimeout(timer);
  }
}
