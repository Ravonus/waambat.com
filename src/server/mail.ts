import nodemailer from "nodemailer";
import { z } from "zod";
import { emailSettingsSchema } from "~/lib/content";
import { getPublishedContent } from "./content";
import { requireAdmin } from "./auth";
const messageSchema = z
  .object({
    to: z.string().email().max(254),
    subject: z
      .string()
      .min(1)
      .max(160)
      .regex(/^[^\r\n]+$/),
    text: z.string().min(1).max(12000),
    replyTo: z.string().email().max(254).optional(),
  })
  .strict();
export async function captureEmail(settings: unknown, input: unknown) {
  const config = emailSettingsSchema.parse(settings);
  const message = messageSchema.parse(input);
  const result = await nodemailer
    .createTransport({ streamTransport: true, buffer: true, newline: "unix" })
    .sendMail({
      ...message,
      from: config.from,
      replyTo: message.replyTo || config.replyTo || undefined,
    });
  return (result.message as Buffer).toString("utf8");
}
export function emailReadiness(settings: z.infer<typeof emailSettingsSchema>) {
  const verified = (process.env.EMAIL_VERIFIED_SENDERS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .includes(settings.from.toLowerCase());
  const transport =
    settings.provider === "gmail"
      ? Boolean(
          process.env.GMAIL_CLIENT_ID &&
            process.env.GMAIL_CLIENT_SECRET &&
            process.env.GMAIL_REFRESH_TOKEN &&
            process.env.GMAIL_USER?.toLowerCase() ===
              settings.from.toLowerCase(),
        )
      : Boolean(
          process.env.SMTP_HOST &&
            process.env.SMTP_USER &&
            process.env.SMTP_PASSWORD &&
            ["465", "587"].includes(process.env.SMTP_PORT ?? ""),
        );
  return {
    ready: settings.enabled && verified && transport,
    verifiedSender: verified,
    transportConfigured: transport,
    enabled: settings.enabled,
  };
}
// Manual sends require an administrator. Public form notifications use published,
// administrator-selected recipients and both the form and global delivery switches.
export async function sendAdminEmail(input: unknown) {
  await requireAdmin();
  const settings = (await getPublishedContent()).email;
  return deliverEmail(settings, input);
}
export async function deliverEmail(
  settings: z.infer<typeof emailSettingsSchema>,
  input: unknown,
) {
  const message = messageSchema.parse(input);
  if (!emailReadiness(settings).ready)
    throw new Error(
      "Verified sender and approved mail transport must be configured before delivery",
    );
  if (settings.provider === "gmail") {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
        client_id: process.env.GMAIL_CLIENT_ID!,
        client_secret: process.env.GMAIL_CLIENT_SECRET!,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!tokenResponse.ok)
      throw new Error("Gmail authorization is unavailable");
    const token = (await tokenResponse.json()) as { access_token?: string };
    if (!token.access_token)
      throw new Error("Gmail authorization is unavailable");
    const mime = await captureEmail(settings, message);
    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: Buffer.from(mime).toString("base64url") }),
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!response.ok)
      throw new Error(
        "Gmail could not confirm delivery; do not automatically retry",
      );
    return { accepted: true };
  }
  const port = Number(process.env.SMTP_PORT);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
    tls: { rejectUnauthorized: true },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
  try {
    const result = await transport.sendMail({
      ...message,
      from: settings.from,
      replyTo: message.replyTo || settings.replyTo || undefined,
    });
    return { accepted: result.accepted.length === 1 };
  } finally {
    transport.close();
  }
}
