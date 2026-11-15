import { state, derived, onMount, watch, onCleanup } from "@kerf-js/core";
import { update as writeBox } from "#/lib/reactive";
import { answerText } from "~/lib/forms";
import type { ContactSubmission } from "~/server/contact";
type Entry = ContactSubmission & {
    key: string;
};
const delivery = {
    disabled: "Email notifications off",
    "not-configured": "Saved · email transport is not configured",
    pending: "Saved · email delivery status not yet confirmed",
    sent: "Notification accepted by email provider",
    unconfirmed: "Saved · email delivery was not confirmed",
};
export default function ContactInbox() {
    const entries = state<Entry[]>([]);
    const next = state<string | null>(null);
    const loaded = state(false);
    const archived = state(false);
    const busy = state(false);
    const status = state("");
    async function load(append = false) {
        writeBox(busy, true);
        try {
            const response = await fetch(`/_kerf/x/waambat/admin/contact${append && next.value ? `?after=${encodeURIComponent(next.value)}` : ""}`, { signal: AbortSignal.timeout(30000), cache: "no-store" });
            const body = (await response.json()) as {
                entries?: Entry[];
                next?: string | null;
                error?: string;
                email?: {
                    ready: boolean;
                };
            };
            if (!response.ok || !body.entries)
                throw new Error(body.error || "Could not load responses.");
            writeBox(entries, (current) => append ? [...current, ...body.entries!] : body.entries!);
            writeBox(next, body.next ?? null);
            writeBox(loaded, true);
            writeBox(status, body.email?.ready
                ? "Email delivery is configured. Each form also has its own notification switch."
                : "Email delivery is off or not configured. Responses are still saved here.");
        }
        catch (error) {
            writeBox(status, error instanceof Error ? error.message : "Could not load responses.");
        }
        finally {
            writeBox(busy, false);
        }
    }
    async function toggle(entry: Entry) {
        writeBox(busy, true);
        try {
            const response = await fetch("/_kerf/x/waambat/admin/contact", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: entry.key, archived: !entry.archived }),
                signal: AbortSignal.timeout(30000),
            });
            const body = (await response.json()) as {
                error?: string;
            };
            if (!response.ok)
                throw new Error(body.error ||
                    "Could not update this response. Refresh before retrying.");
            writeBox(entries, (current) => current.map((item) => item.key === entry.key
                ? { ...item, archived: !entry.archived }
                : item));
            writeBox(status, entry.archived
                ? "Response restored."
                : "Response archived. Turn on Show archived responses to restore it.");
        }
        catch (error) {
            writeBox(status, error instanceof Error
                ? error.message
                : "Could not update the response.");
        }
        finally {
            writeBox(busy, false);
        }
    }
    return (<section className="space-y-4 rounded border border-white/25 p-5" aria-label="Contact inbox">
      <h2 className="text-waambat-pink text-2xl">Contact inbox</h2>
      <p>
        Private responses from your published forms. Question labels are saved
        with each response, so later edits won’t change what someone answered.
      </p>
      <div className="flex flex-wrap gap-5">
        <button type="button" disabled={busy.value} className="text-waambat-link" onClick={() => void load()}>
          {loaded.value ? "Refresh inbox" : "Load inbox"}
        </button>
        <label>
          <input type="checkbox" checked={archived.value} onChange={(event) => writeBox(archived, event.currentTarget.checked)}/>{" "}
          Show archived responses
        </label>
      </div>
      <p role="status" className="text-sm">
        {busy.value ? "Loading…" : status.value}
      </p>
      {loaded.value && !entries.value.some((entry) => archived.value || !entry.archived) && (<p>No responses to show.</p>)}
      {entries.value.filter((entry) => archived.value || !entry.archived)
            .map((entry) => (<details key={entry.key} className="border border-white/20 p-4">
            <summary>
              {entry.formTitle} · {new Date(entry.submittedAt).toLocaleString()}
              {entry.archived && " · archived"}
            </summary>
            <dl className="my-4 space-y-3">
              {entry.answers.map((answer) => (<div key={answer.id}>
                  <dt className="text-waambat-pink">{answer.label}</dt>
                  <dd className="break-words whitespace-pre-wrap">
                    {answerText(answer.value)}
                  </dd>
                </div>))}
            </dl>
            <p className="text-sm opacity-70">{delivery[entry.emailStatus]}</p>
            <button type="button" disabled={busy.value} className="text-waambat-link mt-4" onClick={() => void toggle(entry)}>
              {entry.archived ? "Restore response" : "Archive response"}
            </button>
          </details>))}
      {next.value && (<button type="button" disabled={busy.value} className="text-waambat-link" onClick={() => void load(true)}>
          Load older responses
        </button>)}
    </section>);
}
