"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { AnswerValue, PublicContactForm } from "~/lib/forms";
import FormField from "./FormField";
import styles from "./forms.module.css";

export default function ContactForm({
  form,
  preview = false,
}: {
  form: PublicContactForm;
  preview?: boolean;
}) {
  const prefix = useId();
  const submissionId = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const status = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (message) status.current?.focus();
  }, [message]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (preview) {
      setMessage("Preview only — no response was saved or emailed.");
      return;
    }
    const element = event.currentTarget;
    const data = new FormData(element);
    const answers: Record<string, AnswerValue> = {};
    for (const question of form.questions.filter(
      (question) => !question.archived,
    )) {
      answers[question.id] =
        question.type === "checkbox"
          ? data.has(question.id)
          : question.type === "checkboxes"
            ? data.getAll(question.id).map(String)
            : String(data.get(question.id) ?? "");
    }
    submissionId.current ??= crypto.randomUUID();
    setBusy(true);
    setErrors({});
    setMessage("");
    try {
      const response = await fetch("/api/contact", {
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
        setErrors(result.fields ?? {});
        if ([400, 409].includes(response.status)) submissionId.current = null;
        throw new Error(
          result.error || "Your message could not be saved. Please try again.",
        );
      }
      element.reset();
      submissionId.current = null;
      setMessage(form.successMessage);
    } catch (error) {
      setMessage(
        error instanceof Error && error.name !== "TimeoutError"
          ? error.message
          : "The request timed out. Your answers are still here; submitting again safely checks the same response.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={styles.form}
      aria-labelledby={`${prefix}-title`}
      data-contact-form={form.id}
    >
      <h2 id={`${prefix}-title`} className={styles.title}>
        {form.title}
      </h2>
      {form.description && (
        <p className={styles.description}>{form.description}</p>
      )}
      <form
        method="post"
        action="/api/contact"
        onInput={() => {
          if (message) setMessage("");
        }}
        onSubmit={(event) => void submit(event)}
      >
        <fieldset disabled={busy} className={styles.grid}>
          <legend className={styles.srOnly}>{form.title} questions</legend>
          {form.questions
            .filter((question) => !question.archived)
            .map((question) => (
              <FormField
                key={question.id}
                prefix={prefix}
                question={question}
                error={errors[question.id]}
              />
            ))}
          <div className={styles.trap} aria-hidden="true">
            <label>
              Leave this field empty
              <input name="_waambat_website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <div className={styles.actions}>
            <button type="submit" className={styles.submit} data-busy={busy}>
              <span>{busy ? "Sending…" : form.submitLabel}</span>
              <span className={styles.buttonIcon} aria-hidden="true">
                {busy ? (
                  <i className={styles.spinner} />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12h14m-6-6 6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            </button>
            <span className={styles.help}>* Required</span>
          </div>
        </fieldset>
        <div
          ref={status}
          role="status"
          aria-live="polite"
          tabIndex={-1}
          className={styles.status}
        >
          {errors._form || message}
        </div>
      </form>
    </section>
  );
}
