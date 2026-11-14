import { state, derived, onMount, watch, onCleanup } from "@kerf-js/core";
import { update as writeBox } from "#/lib/reactive";
import type { AnswerValue, PublicContactForm } from "~/lib/forms";
import FormField from "./FormField";
import styles from "./forms.module.css";
export default function ContactForm({ form, preview = false, }: {
    form: PublicContactForm;
    preview?: boolean;
}) {
    const prefix = derived(() => `contact-${form.id}`);
    const submissionId = { current: null as (string | null) | null | undefined };
    const busy = state(false);
    const message = state("");
    const errors = state<Record<string, string>>({});
    const focusStatus = (node: HTMLDivElement | null) => {
        if (node && (errors.value._form || message.value))
            node.focus();
    };
    async function submit(event: Event & {
        currentTarget: HTMLFormElement;
    }) {
        event.preventDefault();
        if (busy.value)
            return;
        if (preview) {
            writeBox(message, "Preview only — no response was saved or emailed.");
            return;
        }
        const element = event.currentTarget;
        const data = new FormData(element);
        const answers: Record<string, AnswerValue> = {};
        for (const question of form.questions.filter((question) => !question.archived)) {
            answers[question.id] =
                question.type === "checkbox"
                    ? data.has(question.id)
                    : question.type === "checkboxes"
                        ? data.getAll(question.id).map(String)
                        : String(data.get(question.id) ?? "");
        }
        submissionId.current ??= crypto.randomUUID();
        writeBox(busy, true);
        writeBox(errors, {});
        writeBox(message, "");
        try {
            const response = await fetch("/_kerf/x/waambat/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    formId: form.id,
                    submissionId: submissionId.current,
                    website: String(data.get("_waambat_website") ?? ""),
                    answers,
                }),
                signal: AbortSignal.timeout(30000),
            });
            const result = (await response.json()) as {
                ok?: boolean;
                error?: string;
                fields?: Record<string, string>;
            };
            if (!response.ok || !result.ok) {
                writeBox(errors, result.fields ?? {});
                if ([400, 409].includes(response.status))
                    submissionId.current = null;
                throw new Error(result.error || "Your message could not be saved. Please try again.");
            }
            element.reset();
            submissionId.current = null;
            writeBox(message, form.successMessage);
        }
        catch (error) {
            writeBox(message, error instanceof Error && error.name !== "TimeoutError"
                ? error.message
                : "The request timed out. Your answers are still here; submitting again safely checks the same response.");
        }
        finally {
            writeBox(busy, false);
        }
    }
    return (<section className={styles.form} aria-labelledby={`${prefix.value}-title`} data-contact-form={form.id}>
      <h2 id={`${prefix.value}-title`} className={styles.title}>
        {form.title}
      </h2>
      {form.description && (<p className={styles.description}>{form.description}</p>)}
      <form method="post" action="/_kerf/x/waambat/contact" onInput={() => {
            if (message.value)
                writeBox(message, "");
        }} onSubmit={(event) => void submit(event)}>
        <fieldset disabled={busy.value} className={styles.grid}>
          <legend className={styles.srOnly}>{form.title} questions</legend>
          {form.questions
            .filter((question) => !question.archived)
            .map((question) => (<FormField key={question.id} prefix={prefix.value} question={question} error={errors.value[question.id]}/>))}
          <div className={styles.trap} aria-hidden="true">
            <label>
              Leave this field empty
              <input name="_waambat_website" tabIndex={-1} autoComplete="off"/>
            </label>
          </div>
          <div className={styles.actions}>
            <button type="submit" className={styles.submit} data-busy={busy.value}>
              <span>{busy.value ? "Sending…" : form.submitLabel}</span>
              <span className={styles.buttonIcon} aria-hidden="true">
                {busy.value ? (<i className={styles.spinner}/>) : (<svg viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>)}
              </span>
            </button>
            <span className={styles.help}>* Required</span>
          </div>
        </fieldset>
        <div ref={focusStatus} role="status" aria-live="polite" tabIndex={-1} className={styles.status}>
          {errors.value._form || message.value}
        </div>
      </form>
    </section>);
}
