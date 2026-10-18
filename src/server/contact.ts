import { getStore } from "@netlify/blobs";
import { createHash, createHmac } from "node:crypto";
import { z } from "zod";
import { answerText, formSubmissionSchema, validateAnswers } from "~/lib/forms";
import type { Content } from "~/lib/content";
import { deliverEmail, emailReadiness } from "./mail";

const emailStatus = z.enum([
  "disabled",
  "not-configured",
  "pending",
  "sent",
  "unconfirmed",
]);
const recordSchema = z.object({
  id: z.string().uuid(),
  formId: z.string(),
  formTitle: z.string(),
  submittedAt: z.string().datetime(),
  answers: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      type: z.string(),
      value: z.union([z.string(), z.boolean(), z.array(z.string())]),
    }),
  ),
  emailStatus,
  archived: z.boolean(),
});
export type ContactSubmission = z.infer<typeof recordSchema>;
type Store = ReturnType<typeof getStore>;
export class ContactError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function contactSource(request: Request) {
  // Netlify supplies this header. Do not let callers select an arbitrary recipient or retain their raw IP.
  const source = request.headers.get("x-nf-client-connection-ip") ?? "unknown";
  return createHmac("sha256", process.env.AUTH_SECRET ?? "local-contact-limit")
    .update(source)
    .digest("hex");
}
export async function withContactStore<T>(
  operation: (store: Store) => Promise<T>,
) {
  const context = process.env.WAAMBAT_CONTENT_CONTEXT ?? "production";
  if (!/^[a-z0-9-]{1,80}$/.test(context))
    throw new ContactError(503, "Contact storage is unavailable.");
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const fetcher: typeof fetch = async (input, options) => {
    if (controller.signal.aborted) return new Response(null, { status: 408 });
    try {
      return await fetch(input, { ...options, signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted) return new Response(null, { status: 408 });
      throw error;
    }
  };
  try {
    return await Promise.race([
      operation(
        getStore({
          name: `waambat-contact-${context}`,
          consistency: "strong",
          fetch: fetcher,
        }),
      ),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(
            new ContactError(
              503,
              "Contact storage is taking too long. Your answers are preserved; try again shortly.",
            ),
          );
        }, 25000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function admit(store: Store, source: string) {
  const key = `limits/${Math.floor(Date.now() / 600000)}/${source}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const previous = await store.getWithMetadata(key, { type: "json" });
    if (previous && !previous.etag)
      throw new ContactError(503, "Contact storage revision is unavailable.");
    const count = previous ? z.number().int().min(0).parse(previous.data) : 0;
    if (count >= 5)
      throw new ContactError(
        429,
        "Please wait a few minutes before sending another message.",
      );
    const result = await store.setJSON(
      key,
      count + 1,
      previous ? { onlyIfMatch: previous.etag } : { onlyIfNew: true },
    );
    if (result.modified) return;
  }
  throw new ContactError(429, "Please wait a moment before trying again.");
}
export async function receiveContact(
  content: Content,
  input: unknown,
  source: string,
  store: Store,
  notify = deliverEmail,
) {
  const payload = formSubmissionSchema.parse(input);
  if (payload.website) return { ok: true as const };
  const form = content.forms.find(
    (candidate) => candidate.id === payload.formId && candidate.enabled,
  );
  if (
    !form ||
    !content.pages.some((page) => page.slug === form.page && !page.archived)
  )
    throw new ContactError(404, "This form is no longer accepting responses.");
  const validated = validateAnswers(form, payload.answers);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ formId: form.id, answers: validated.answers }))
    .digest("hex");
  const claimKey = `requests/${payload.submissionId}`;
  const claimSchema = z.object({
    key: z.string().regex(/^submissions\/\d{13}-[a-f0-9-]{36}$/),
    fingerprint: z.string(),
    record: recordSchema,
  });
  const existing = await store.get(claimKey, { type: "json" });
  if (existing) {
    const claimed = claimSchema.parse(existing);
    if (claimed.fingerprint !== fingerprint)
      throw new ContactError(
        409,
        "Your earlier response was saved. Submit again to send these edited answers as a new response.",
      );
    // Recover a write interrupted after reservation; never repeat an uncertain email delivery.
    await store.setJSON(
      claimed.key,
      {
        ...claimed.record,
        emailStatus:
          claimed.record.emailStatus === "pending"
            ? "unconfirmed"
            : claimed.record.emailStatus,
      },
      { onlyIfNew: true },
    );
    return { ok: true as const };
  }
  await admit(store, source);
  const now = Date.now();
  const key = `submissions/${String(9999999999999 - now).padStart(13, "0")}-${payload.submissionId}`;
  const record: ContactSubmission = {
    id: payload.submissionId,
    formId: form.id,
    formTitle: form.title,
    submittedAt: new Date(now).toISOString(),
    answers: validated.answers,
    archived: false,
    emailStatus: !form.emailNotifications
      ? "disabled"
      : emailReadiness(content.email).ready
        ? "pending"
        : "not-configured",
  };
  const claim = await store.setJSON(
    claimKey,
    { key, fingerprint, record },
    { onlyIfNew: true },
  );
  if (!claim.modified) {
    // Another invocation owns this ID. Check its payload; do not send mail twice.
    return receiveContact(content, payload, source, store, notify);
  }
  await store.setJSON(key, record, { onlyIfNew: true });
  if (record.emailStatus === "pending") {
    try {
      const text = record.answers
        .map((answer) => `${answer.label}\n${answerText(answer.value)}`)
        .join("\n\n");
      const result = await notify(content.email, {
        to: form.recipient,
        replyTo: validated.replyTo,
        subject: `New response: ${form.title}`
          .replace(/[\r\n]/g, " ")
          .slice(0, 160),
        text: `${text.slice(0, 11500)}\n\nReceived ${record.submittedAt}.\nView the complete response in the WAAMBAT admin inbox.`,
      });
      record.emailStatus = result.accepted ? "sent" : "unconfirmed";
    } catch {
      record.emailStatus = "unconfirmed";
    }
    // The durable response already exists. A notification failure never loses the submission.
    try {
      await updateSubmission(store, key, { emailStatus: record.emailStatus });
    } catch {
      /* Keep the saved response and its pending status; do not resend. */
    }
  }
  return { ok: true as const };
}
export async function updateSubmission(
  store: Store,
  key: string,
  change: Partial<Pick<ContactSubmission, "archived" | "emailStatus">>,
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const found = await store.getWithMetadata(key, { type: "json" });
    if (!found) throw new ContactError(404, "Response not found.");
    if (!found.etag)
      throw new ContactError(503, "Contact storage revision is unavailable.");
    const record = recordSchema.parse(found.data);
    const result = await store.setJSON(
      key,
      { ...record, ...change },
      { onlyIfMatch: found.etag },
    );
    if (result.modified) return;
  }
  throw new ContactError(
    409,
    "This response changed. Refresh the inbox before trying again.",
  );
}
export async function contactInbox(store: Store, after = "") {
  const { blobs } = await store.list({ prefix: "submissions/" });
  const keys = blobs
    .map((blob) => blob.key)
    .sort()
    .filter((key) => key > after);
  const page = keys.slice(0, 20);
  const entries = await Promise.all(
    page.map(async (key) => {
      const record = await store.get(key, { type: "json" });
      return record ? { ...recordSchema.parse(record), key } : null;
    }),
  );
  return {
    entries: entries.filter((entry) => entry !== null),
    next: keys.length > 20 ? page.at(-1) : null,
  };
}
