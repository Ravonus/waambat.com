import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { getStore, setEnvironmentContext } from "@netlify/blobs";
import { contentSchema } from "../src/lib/content";
import { seedContent } from "../src/content/seed";
import {
  contactFormSchema,
  defaultContactForm,
  FormValidationError,
  publicForm,
  questionSchema,
  type AnswerValue,
  validateAnswers,
} from "../src/lib/forms";
import { newTabProps } from "../src/lib/new-tab";
import { removedContent } from "../src/lib/content-change";
import {
  contactInbox,
  receiveContact,
  updateSubmission,
} from "../src/server/contact";
import { captureEmail } from "../src/server/mail";

test("questions validate required answers, types, choices and archived fields on the server", () => {
  assert.throws(
    () => validateAnswers(defaultContactForm, {}),
    FormValidationError,
  );
  assert.throws(
    () =>
      validateAnswers(defaultContactForm, {
        name: "Visitor",
        email: "bad\r\nBcc:other@example.com",
        message: "Hello",
      }),
    FormValidationError,
  );
  assert.throws(
    () =>
      validateAnswers(defaultContactForm, {
        name: "Visitor",
        email: "visitor@example.com",
        message: "Hello",
        interest: "Injected choice",
      }),
    FormValidationError,
  );
  const form = contactFormSchema.parse({
    ...defaultContactForm,
    questions: [
      {
        id: "choice",
        label: "Choose several",
        type: "checkboxes",
        required: true,
        options: ["First", "Second"],
      },
      { id: "agree", label: "Agree", type: "checkbox", required: true },
      { id: "date", label: "When?", type: "date" },
      { id: "count", label: "How many?", type: "number" },
      { id: "old", label: "Retired question", archived: true },
    ],
  });
  const invalid: Record<string, AnswerValue>[] = [
    { choice: [], agree: true },
    { choice: ["Injected"], agree: true },
    { choice: ["First", "First"], agree: true },
    { choice: ["First"], agree: "yes" },
    { choice: ["First"], agree: true, date: "2026-02-30" },
    { choice: ["First"], agree: true, count: "NaN" },
    { choice: ["First"], agree: true, old: "Not visible" },
  ];
  for (const answers of invalid)
    assert.throws(() => validateAnswers(form, answers), FormValidationError);
  assert.equal(
    validateAnswers(form, {
      choice: ["First"],
      agree: true,
      date: "2026-02-28",
      count: "-1.5",
    }).answers.length,
    4,
  );
  assert.equal(
    questionSchema.safeParse({
      id: "bad",
      label: "Options",
      type: "radio",
      options: ["One", "One"],
    }).success,
    false,
  );
  assert.equal(
    questionSchema.safeParse({
      id: "bad",
      label: "Options",
      type: "select",
      options: ["One"],
      defaultValue: "Other",
    }).success,
    false,
  );
});

test("forms share draft/archive protection and never expose notification addresses to public clients", () => {
  const content = contentSchema.parse({
    ...seedContent,
    formsVersion: 1,
    forms: [defaultContactForm],
  });
  const changed = structuredClone(content);
  changed.forms[0]!.questions[0]!.label = "Your preferred name";
  changed.forms[0]!.recipient = "other@example.com";
  assert.deepEqual(removedContent(content, changed), []);
  changed.forms[0]!.questions.shift();
  assert.match(removedContent(content, changed).join(), /question name/);
  assert.equal("recipient" in publicForm(defaultContactForm), false);
  assert.equal("emailNotifications" in publicForm(defaultContactForm), false);
  for (const href of [
    "https://objkt.com/artwork",
    "http://instagram.com/waambat",
  ])
    assert.deepEqual(newTabProps(href), {
      target: "_blank",
      rel: "noopener noreferrer",
    });
  for (const href of [
    "/ordinals",
    "#main-content",
    "mailto:studiowaambat@gmail.com",
    undefined,
  ])
    assert.deepEqual(newTabProps(href), {});
});

test("real Blobs SDK: durable inbox, concurrent deduplication, notification switches, failure recovery and rate limiting", async () => {
  const records = new Map<string, { etag: string; body: string }>();
  let revision = 0;
  const server = createServer(async (request, response) => {
    const url = new URL(request.url!, "http://localhost");
    const path = decodeURIComponent(url.pathname);
    if (request.method === "GET" && url.searchParams.has("prefix")) {
      const prefix = `${path}/${url.searchParams.get("prefix")}`;
      response.writeHead(200, { "Content-Type": "application/json" }).end(
        JSON.stringify({
          blobs: [...records]
            .filter(([key]) => key.startsWith(prefix))
            .map(([key, entry]) => ({
              key: key.slice(path.length + 1),
              etag: entry.etag,
            })),
          directories: [],
        }),
      );
      return;
    }
    const entry = records.get(path);
    if (request.method === "GET") {
      if (!entry) response.writeHead(404).end();
      else
        response
          .writeHead(200, {
            etag: entry.etag,
            "Content-Type": "application/json",
          })
          .end(entry.body);
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    if (
      (request.headers["if-none-match"] === "*" && entry) ||
      (request.headers["if-match"] &&
        request.headers["if-match"] !== entry?.etag)
    ) {
      response.writeHead(412).end();
      return;
    }
    const etag = `"${++revision}"`;
    records.set(path, { etag, body: Buffer.concat(chunks).toString("utf8") });
    response.writeHead(200, { etag }).end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const names = [
    "EMAIL_VERIFIED_SENDERS",
    "SMTP_HOST",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_PORT",
  ] as const;
  const previous = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );
  setEnvironmentContext({
    siteID: "contact-test",
    token: "isolated-token",
    edgeURL: origin,
    uncachedEdgeURL: origin,
  });
  try {
    process.env.EMAIL_VERIFIED_SENDERS = "sender@example.com";
    process.env.SMTP_HOST = "smtp.example.invalid";
    process.env.SMTP_USER = "test";
    process.env.SMTP_PASSWORD = "test-only";
    process.env.SMTP_PORT = "587";
    const store = getStore({ name: "contact-isolated", consistency: "strong" });
    const content = contentSchema.parse({
      ...seedContent,
      formsVersion: 1,
      forms: [defaultContactForm],
      email: { provider: "custom", enabled: true, from: "sender@example.com" },
    });
    const payload = () => ({
      formId: "contact",
      submissionId: randomUUID(),
      answers: {
        name: "Test visitor",
        email: "visitor@example.com",
        message: "A test response",
      },
    });
    let sent = 0;
    const notify = async (_settings: unknown, input: unknown) => {
      sent++;
      const message = input as { to: string; replyTo: string };
      assert.equal(message.to, defaultContactForm.recipient);
      assert.equal(message.replyTo, "visitor@example.com");
      return { accepted: true };
    };
    await receiveContact(
      content,
      payload(),
      "notifications-off",
      store,
      notify,
    );
    assert.equal(sent, 0);
    let inbox = await contactInbox(store);
    assert.equal(inbox.entries.length, 1);
    assert.equal(inbox.entries[0]!.emailStatus, "disabled");
    content.forms[0]!.emailNotifications = true;
    const duplicate = payload();
    await Promise.all([
      receiveContact(content, duplicate, "duplicate", store, notify),
      receiveContact(content, duplicate, "duplicate", store, notify),
    ]);
    assert.equal(sent, 1);
    inbox = await contactInbox(
      getStore({ name: "contact-isolated", consistency: "strong" }),
    );
    assert.equal(inbox.entries.length, 2);
    const emailed = inbox.entries.find(
      (entry) => entry.id === duplicate.submissionId,
    )!;
    assert.equal(emailed.emailStatus, "sent");
    await updateSubmission(store, emailed.key, { archived: true });
    assert.equal(
      (await contactInbox(store)).entries.find(
        (entry) => entry.id === duplicate.submissionId,
      )!.archived,
      true,
    );
    await updateSubmission(store, emailed.key, { archived: false });
    assert.equal(
      (await contactInbox(store)).entries.find(
        (entry) => entry.id === duplicate.submissionId,
      )!.archived,
      false,
    );
    await assert.rejects(
      receiveContact(
        content,
        {
          ...duplicate,
          answers: { ...duplicate.answers, message: "Different response" },
        },
        "duplicate",
        store,
        notify,
      ),
    );
    const failed = payload();
    await receiveContact(content, failed, "mail-failure", store, async () => {
      throw new Error("Uncertain SMTP response");
    });
    await receiveContact(content, failed, "mail-failure", store, notify);
    assert.equal(sent, 1);
    assert.equal(
      (await contactInbox(store)).entries.find(
        (entry) => entry.id === failed.submissionId,
      )!.emailStatus,
      "unconfirmed",
    );
    content.email.enabled = false;
    await receiveContact(content, payload(), "global-off", store, notify);
    assert.equal(sent, 1);
    assert.equal(
      (await contactInbox(store)).entries.filter(
        (entry) => entry.emailStatus === "not-configured",
      ).length,
      1,
    );
    for (let index = 0; index < 5; index++)
      await receiveContact(content, payload(), "rate-limited", store, notify);
    await assert.rejects(
      receiveContact(content, payload(), "rate-limited", store, notify),
      /wait a few minutes/,
    );
    const count = (await contactInbox(store)).entries.length;
    await receiveContact(
      content,
      { ...payload(), website: "bot" },
      "bot",
      store,
      notify,
    );
    assert.equal((await contactInbox(store)).entries.length, count);
    content.forms[0]!.enabled = false;
    await assert.rejects(
      receiveContact(content, payload(), "disabled", store, notify),
      /no longer accepting/,
    );
    const mime = await captureEmail(content.email, {
      to: "capture@example.invalid",
      replyTo: "visitor@example.com",
      subject: "Contact preview",
      text: "Captured only",
    });
    assert.match(mime, /Reply-To: visitor@example.com/);
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
    setEnvironmentContext({});
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
