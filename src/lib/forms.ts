import { z } from "zod";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (value) => !/[\u0000-\u0008]|<[!/?a-z]/i.test(value),
      "Use plain text, without HTML",
    );
const id = z.string().regex(/^[a-z0-9-]{1,80}$/);
export const questionTypes = [
  "text",
  "email",
  "textarea",
  "select",
  "radio",
  "checkbox",
  "checkboxes",
  "tel",
  "url",
  "number",
  "date",
] as const;
export const questionSchema = z
  .object({
    id,
    label: text(200).refine(Boolean, "A question is required"),
    type: z.enum(questionTypes).default("text"),
    placeholder: text(200).default(""),
    help: text(500).default(""),
    required: z.boolean().default(false),
    archived: z.boolean().default(false),
    width: z.enum(["full", "half"]).default("full"),
    options: z
      .array(text(160).refine(Boolean, "Choices cannot be empty"))
      .max(30)
      .default([]),
    defaultValue: text(2000).default(""),
    maxLength: z.number().int().min(1).max(6000).default(2000),
  })
  .strict()
  .superRefine((question, ctx) => {
    if (["select", "radio", "checkboxes"].includes(question.type)) {
      if (
        !question.options.length ||
        new Set(question.options).size !== question.options.length
      )
        ctx.addIssue({
          code: "custom",
          message: "Add unique choices for this question",
        });
      const defaults =
        question.type === "checkboxes"
          ? question.defaultValue.split("\n").filter(Boolean)
          : [question.defaultValue].filter(Boolean);
      if (defaults.some((value) => !question.options.includes(value)))
        ctx.addIssue({
          code: "custom",
          message: "The prefilled answer must match an available choice",
        });
    }
  });
export const contactFormSchema = z
  .object({
    id,
    title: text(160).refine(Boolean, "A form title is required"),
    description: text(1000).default(""),
    page: id,
    enabled: z.boolean().default(true),
    submitLabel: text(80).refine(Boolean).default("Send message"),
    successMessage: text(1000)
      .refine(Boolean)
      .default("Thank you — your message has been received."),
    emailNotifications: z.boolean().default(false),
    recipient: z.string().email().max(254).default("studiowaambat@gmail.com"),
    questions: z.array(questionSchema).min(1).max(30),
  })
  .strict()
  .superRefine((form, ctx) => {
    if (
      new Set(form.questions.map((question) => question.id)).size !==
      form.questions.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Each question needs a unique ID",
      });
    if (form.enabled && !form.questions.some((question) => !question.archived))
      ctx.addIssue({
        code: "custom",
        message: "An enabled form needs at least one visible question",
      });
  });
export type ContactFormDefinition = z.infer<typeof contactFormSchema>;
export type FormQuestion = z.infer<typeof questionSchema>;
export type AnswerValue = string | boolean | string[];
export type SubmittedAnswer = {
  id: string;
  label: string;
  type: FormQuestion["type"];
  value: AnswerValue;
};
export const defaultContactForm = contactFormSchema.parse({
  id: "contact",
  page: "contact-waambat",
  title: "Get in touch",
  description:
    "For collecting, commissions, collaborations, or a question about the work.",
  questions: [
    {
      id: "name",
      type: "text",
      label: "Your name",
      required: true,
      width: "half",
      placeholder: "Name",
    },
    {
      id: "email",
      type: "email",
      label: "Email address",
      required: true,
      width: "half",
      placeholder: "you@example.com",
    },
    {
      id: "interest",
      type: "select",
      label: "What brings you here?",
      options: [
        "Collecting artwork",
        "A commission",
        "Collaboration or exhibition",
        "Press",
        "Something else",
      ],
    },
    {
      id: "message",
      type: "textarea",
      label: "Your message",
      required: true,
      maxLength: 6000,
      placeholder: "Tell me a little about what you have in mind.",
    },
  ],
});
export const formSubmissionSchema = z
  .object({
    formId: id,
    submissionId: z.string().uuid(),
    website: z.string().max(200).default(""),
    answers: z.record(
      z.union([
        z.string().max(6000),
        z.boolean(),
        z.array(z.string().max(160)).max(30),
      ]),
    ),
  })
  .strict();
export class FormValidationError extends Error {
  constructor(public fields: Record<string, string>) {
    super("Please check the highlighted questions.");
  }
}
export function validateAnswers(
  form: ContactFormDefinition,
  input: Record<string, AnswerValue>,
) {
  const questions = form.questions.filter((question) => !question.archived);
  const errors: Record<string, string> = {};
  const answers: SubmittedAnswer[] = [];
  let replyTo: string | undefined;
  if (
    Object.keys(input).some(
      (key) => !questions.some((question) => question.id === key),
    )
  )
    throw new FormValidationError({
      _form: "This form changed. Reload the page before submitting.",
    });
  for (const question of questions) {
    const raw = input[question.id];
    let value: AnswerValue = typeof raw === "string" ? raw.trim() : (raw ?? "");
    if (question.type === "checkbox") {
      if (raw !== undefined && typeof raw !== "boolean")
        errors[question.id] = "Choose yes or no.";
      value = raw === true;
    } else if (question.type === "checkboxes") {
      if (
        raw !== undefined &&
        (!Array.isArray(raw) ||
          raw.some((item) => !question.options.includes(item)) ||
          new Set(raw).size !== raw.length)
      )
        errors[question.id] = "Choose from the available options.";
      value = Array.isArray(raw) ? raw : [];
    } else if (typeof value !== "string") {
      errors[question.id] = "Enter a single answer.";
      value = "";
    }
    const empty =
      value === "" ||
      value === false ||
      (Array.isArray(value) && !value.length);
    if (question.required && empty)
      errors[question.id] = "This question is required.";
    if (typeof value === "string" && value) {
      if (value.length > question.maxLength)
        errors[question.id] = `Use ${question.maxLength} characters or fewer.`;
      if (question.type === "email") {
        if (!z.string().email().max(254).safeParse(value).success)
          errors[question.id] = "Enter a valid email address.";
        else replyTo ??= value;
      }
      if (question.type === "url" && !z.string().url().safeParse(value).success)
        errors[question.id] = "Enter a complete URL.";
      if (
        question.type === "number" &&
        (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(value) ||
          !Number.isFinite(Number(value)))
      )
        errors[question.id] = "Enter a number.";
      if (
        question.type === "date" &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          !Number.isFinite(Date.parse(value)) ||
          new Date(value).toISOString().slice(0, 10) !== value)
      )
        errors[question.id] = "Enter a valid date.";
      if (
        ["select", "radio"].includes(question.type) &&
        !question.options.includes(value)
      )
        errors[question.id] = "Choose from the available options.";
    }
    answers.push({
      id: question.id,
      label: question.label,
      type: question.type,
      value,
    });
  }
  if (Object.keys(errors).length) throw new FormValidationError(errors);
  return { answers, replyTo };
}
export function answerText(value: AnswerValue) {
  return Array.isArray(value)
    ? value.join(", ")
    : typeof value === "boolean"
      ? value
        ? "Yes"
        : "No"
      : value || "—";
}
export function publicForm(form: ContactFormDefinition) {
  // Delivery settings stay on the server, including the private recipient address.
  const {
    recipient: _recipient,
    emailNotifications: _emailNotifications,
    ...visible
  } = form;
  void _recipient;
  void _emailNotifications;
  return visible;
}
export type PublicContactForm = ReturnType<typeof publicForm>;
