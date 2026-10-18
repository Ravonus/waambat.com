"use client";
import { useState } from "react";
import {
  contactFormSchema,
  defaultContactForm,
  publicForm,
  questionSchema,
  questionTypes,
  type ContactFormDefinition,
  type FormQuestion,
} from "~/lib/forms";
import type { SitePage } from "~/lib/content";
import type { Theme } from "~/lib/theme";
import { themeStyle } from "~/lib/theme";
import ContactForm from "../components/forms/ContactForm";
import styles from "../components/forms/forms.module.css";

const names: Record<FormQuestion["type"], string> = {
  text: "Short answer",
  email: "Email",
  textarea: "Long answer",
  select: "Dropdown",
  radio: "Choose one",
  checkbox: "Checkbox / consent",
  checkboxes: "Choose several",
  tel: "Phone",
  url: "Website URL",
  number: "Number",
  date: "Date",
};
function Field({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      {label}
      {multiline ? (
        <textarea
          className={styles.control}
          rows={3}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className={styles.control}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}
export default function FormsEditor({
  forms,
  pages,
  theme,
  onChange,
}: {
  forms: ContactFormDefinition[];
  pages: SitePage[];
  theme: Theme;
  onChange: (forms: ContactFormDefinition[]) => void;
}) {
  const [newType, setNewType] = useState<FormQuestion["type"]>("text");
  const availablePages = pages.filter(
    (page) =>
      !page.archived && !["splash", "split-splash"].includes(page.layout),
  );
  function edit(index: number, change: (form: ContactFormDefinition) => void) {
    const next = structuredClone(forms);
    change(next[index]!);
    onChange(next);
  }
  return (
    <section
      className="space-y-5"
      aria-label="Contact forms"
      style={themeStyle(theme)}
    >
      <h2 className="text-waambat-pink text-2xl">Contact forms</h2>
      <p>
        Create forms, choose where they appear, and edit every question. Changes
        use the same Save draft → Preview → Publish controls as your artwork.
        Disable a form or archive a question to hide it while keeping past
        responses.
      </p>
      {forms.map((form, formIndex) => (
        <details
          key={form.id}
          open
          className="rounded border border-white/25 p-5"
        >
          <summary className="text-waambat-pink text-xl">
            {form.title}
            {!form.enabled && " · hidden"}
          </summary>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field
              label="Form title"
              value={form.title}
              onChange={(value) =>
                edit(formIndex, (item) => {
                  item.title = value;
                })
              }
            />
            <label className="block text-sm">
              Show on page
              <select
                className={styles.control}
                value={form.page}
                onChange={(event) =>
                  edit(formIndex, (item) => {
                    item.page = event.target.value;
                  })
                }
              >
                {availablePages.map((page) => (
                  <option key={page.slug} value={page.slug}>
                    {page.title} (/{page.slug})
                  </option>
                ))}
              </select>
            </label>
            <div className="md:col-span-2">
              <Field
                label="Form introduction"
                value={form.description}
                multiline
                onChange={(value) =>
                  edit(formIndex, (item) => {
                    item.description = value;
                  })
                }
              />
            </div>
            <Field
              label="Submit button text"
              value={form.submitLabel}
              onChange={(value) =>
                edit(formIndex, (item) => {
                  item.submitLabel = value;
                })
              }
            />
            <Field
              label="Thank-you message"
              value={form.successMessage}
              onChange={(value) =>
                edit(formIndex, (item) => {
                  item.successMessage = value;
                })
              }
            />
            <label className={styles.choice}>
              <input
                type="checkbox"
                className={styles.check}
                checked={form.enabled}
                onChange={(event) =>
                  edit(formIndex, (item) => {
                    item.enabled = event.target.checked;
                  })
                }
              />
              Show this form
            </label>
          </div>
          <div className="my-6 space-y-4 border-y border-white/20 py-5">
            <h3 className="text-waambat-pink">Email notifications</h3>
            <label className={styles.choice}>
              <input
                type="checkbox"
                className={styles.check}
                checked={form.emailNotifications}
                onChange={(event) =>
                  edit(formIndex, (item) => {
                    item.emailNotifications = event.target.checked;
                  })
                }
              />
              Email me when this form receives a response
            </label>
            <Field
              label="Send notifications to"
              type="email"
              value={form.recipient}
              onChange={(value) =>
                edit(formIndex, (item) => {
                  item.recipient = value;
                })
              }
            />
            <p className="text-sm opacity-70">
              Responses are saved in the private inbox whether email is on or
              off. Email also requires the Outgoing email switch and a
              configured sender. Replies go to the visitor’s email answer.
            </p>
          </div>
          <h3 className="text-waambat-pink mb-4">Questions</h3>
          <div className="space-y-4">
            {form.questions.map((question, index) => {
              const set = (change: (question: FormQuestion) => void) =>
                edit(formIndex, (item) => change(item.questions[index]!));
              const choices = ["select", "radio", "checkboxes"].includes(
                question.type,
              );
              return (
                <details
                  key={question.id}
                  className="border border-white/20 p-4"
                >
                  <summary>
                    {index + 1}. {question.label} · {names[question.type]}
                    {question.archived && " · archived"}
                  </summary>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field
                      label="Question label"
                      value={question.label}
                      onChange={(value) =>
                        set((item) => {
                          item.label = value;
                        })
                      }
                    />
                    <label className="block text-sm">
                      Input type
                      <select
                        className={styles.control}
                        value={question.type}
                        onChange={(event) =>
                          set((item) => {
                            item.type = event.target
                              .value as FormQuestion["type"];
                            item.defaultValue = "";
                            if (
                              ["select", "radio", "checkboxes"].includes(
                                item.type,
                              ) &&
                              !item.options.length
                            )
                              item.options = ["First choice", "Second choice"];
                          })
                        }
                      >
                        {questionTypes.map((type) => (
                          <option key={type} value={type}>
                            {names[type]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Field
                      label="Placeholder"
                      value={question.placeholder}
                      onChange={(value) =>
                        set((item) => {
                          item.placeholder = value;
                        })
                      }
                    />
                    <Field
                      label="Help text"
                      value={question.help}
                      onChange={(value) =>
                        set((item) => {
                          item.help = value;
                        })
                      }
                    />
                    {choices && (
                      <div className="md:col-span-2">
                        <Field
                          label="Choices (one per line)"
                          multiline
                          value={question.options.join("\n")}
                          onChange={(value) =>
                            set((item) => {
                              item.options = value.split("\n");
                            })
                          }
                        />
                      </div>
                    )}
                    {question.type === "checkbox" ? (
                      <label className={styles.choice}>
                        <input
                          type="checkbox"
                          className={styles.check}
                          checked={question.defaultValue === "true"}
                          onChange={(event) =>
                            set((item) => {
                              item.defaultValue = String(event.target.checked);
                            })
                          }
                        />
                        Checked by default
                      </label>
                    ) : (
                      <Field
                        label={
                          question.type === "checkboxes"
                            ? "Prefilled choices (one per line)"
                            : "Prefilled answer (optional)"
                        }
                        multiline={
                          question.type === "textarea" ||
                          question.type === "checkboxes"
                        }
                        value={question.defaultValue}
                        onChange={(value) =>
                          set((item) => {
                            item.defaultValue = value;
                          })
                        }
                      />
                    )}
                    <label className="block text-sm">
                      Width
                      <select
                        className={styles.control}
                        value={question.width}
                        onChange={(event) =>
                          set((item) => {
                            item.width = event.target.value as "full" | "half";
                          })
                        }
                      >
                        <option value="full">Full row</option>
                        <option value="half">Half row on larger screens</option>
                      </select>
                    </label>
                    {["text", "email", "textarea", "tel", "url"].includes(
                      question.type,
                    ) && (
                      <label className="block text-sm">
                        Maximum answer length
                        <input
                          type="number"
                          min={1}
                          max={6000}
                          className={styles.control}
                          value={question.maxLength}
                          onChange={(event) =>
                            set((item) => {
                              item.maxLength = Number(event.target.value);
                            })
                          }
                        />
                      </label>
                    )}
                    <label className={styles.choice}>
                      <input
                        type="checkbox"
                        className={styles.check}
                        checked={question.required}
                        onChange={(event) =>
                          set((item) => {
                            item.required = event.target.checked;
                          })
                        }
                      />
                      Required answer
                    </label>
                    <label className={styles.choice}>
                      <input
                        type="checkbox"
                        className={styles.check}
                        checked={question.archived}
                        onChange={(event) =>
                          set((item) => {
                            item.archived = event.target.checked;
                          })
                        }
                      />
                      Archive question
                    </label>
                  </div>
                  <div className="mt-4 flex gap-5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() =>
                        edit(formIndex, (item) => {
                          [item.questions[index - 1], item.questions[index]] = [
                            item.questions[index]!,
                            item.questions[index - 1]!,
                          ];
                        })
                      }
                    >
                      Move question up
                    </button>
                    <button
                      type="button"
                      disabled={index === form.questions.length - 1}
                      onClick={() =>
                        edit(formIndex, (item) => {
                          [item.questions[index + 1], item.questions[index]] = [
                            item.questions[index]!,
                            item.questions[index + 1]!,
                          ];
                        })
                      }
                    >
                      Move question down
                    </button>
                  </div>
                </details>
              );
            })}
          </div>
          <div className="my-5 flex flex-wrap items-end gap-4">
            <label>
              New question type
              <select
                className={styles.control}
                value={newType}
                onChange={(event) =>
                  setNewType(event.target.value as FormQuestion["type"])
                }
              >
                {questionTypes.map((type) => (
                  <option key={type} value={type}>
                    {names[type]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="text-waambat-link border border-white/30 px-4 py-3"
              disabled={form.questions.length >= 30}
              onClick={() =>
                edit(formIndex, (item) => {
                  item.questions.push(
                    questionSchema.parse({
                      id: `question-${crypto.randomUUID()}`,
                      label: "New question",
                      type: newType,
                      options: ["select", "radio", "checkboxes"].includes(
                        newType,
                      )
                        ? ["First choice", "Second choice"]
                        : [],
                    }),
                  );
                })
              }
            >
              Add question
            </button>
          </div>
          <details>
            <summary className="text-waambat-link">Preview this form</summary>
            <ContactForm
              key={JSON.stringify(form)}
              form={publicForm(form)}
              preview
            />
          </details>
        </details>
      ))}
      <button
        type="button"
        className="text-waambat-link border border-white/30 px-4 py-3"
        disabled={forms.length >= 20 || !availablePages.length}
        onClick={() =>
          onChange([
            ...forms,
            contactFormSchema.parse({
              ...structuredClone(defaultContactForm),
              id: `form-${crypto.randomUUID()}`,
              title: "New contact form",
              page:
                availablePages.find((page) => page.slug === "contact-waambat")
                  ?.slug ?? availablePages[0]!.slug,
            }),
          ])
        }
      >
        Create another form
      </button>
    </section>
  );
}
