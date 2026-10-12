import test from "node:test";
import assert from "node:assert/strict";
import { instagramTarget } from "../src/lib/instagram";
import { artworkSchema, emailSettingsSchema } from "../src/lib/content";
import { captureEmail, emailReadiness } from "../src/server/mail";
import { approvedGoogleProfile } from "../src/server/auth";
test("artist email authorization requires a verified exact allowed Google identity", () => {
  const previous = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "waambat@gmail.com";
  try {
    assert.equal(
      approvedGoogleProfile({
        email: "WAAMBAT@gmail.com",
        email_verified: true,
      }),
      true,
    );
    for (const profile of [
      { email: "waambat@gmail.com", email_verified: false },
      { email: "waambat@gmail.com" },
      { email: "someone@gmail.com", email_verified: true },
      undefined,
    ])
      assert.equal(approvedGoogleProfile(profile), false);
  } finally {
    if (previous === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = previous;
  }
});
test("Instagram URLs allow only supported exact destinations and highlights have no embed", () => {
  assert.equal(
    instagramTarget("https://instagram.com/reel/ABCdef123/?igsh=x")?.embed,
    "https://www.instagram.com/reel/ABCdef123/embed/",
  );
  assert.equal(
    instagramTarget("https://www.instagram.com/stories/highlights/123456789/")
      ?.embed,
    null,
  );
  for (const value of [
    "https://www.instagram.com.attacker.test/p/ABCdef123/",
    "https://attacker@www.instagram.com/p/ABCdef123/",
    "http://instagram.com/p/ABCdef123/",
    "https://www.instagram.com/p/ABCdef123/embed/",
    "https://www.instagram.com/accounts/login/",
    "javascript:alert(1)",
  ])
    assert.equal(instagramTarget(value), null);
  const item = {
    id: "instagram-test",
    title: "",
    year: "",
    description: "",
    tokenLink: "https://instagram.com/p/ABCdef123/",
    videoSrc: "",
    poster: "",
    kind: "instagram",
  };
  assert.ok(artworkSchema.safeParse(item).success);
  assert.equal(
    artworkSchema.safeParse({ ...item, title: "<script>alert(1)</script>" })
      .success,
    false,
  );
});
test("email capture never uses delivery transport; verified sender and configuration are mandatory", async () => {
  const settings = emailSettingsSchema.parse({});
  const mime = await captureEmail(settings, {
    to: "capture@example.invalid",
    subject: "Sandbox configuration",
    text: "No outbound message",
  });
  assert.match(mime, /capture@example.invalid/);
  assert.match(mime, /No outbound message/);
  assert.equal(emailReadiness(settings).ready, false);
  await assert.rejects(() =>
    captureEmail(settings, {
      to: "capture@example.invalid",
      subject: "Bad\r\nBcc: somebody@example.com",
      text: "No",
    }),
  );
  assert.equal(
    emailSettingsSchema.safeParse({
      ...settings,
      from: "waambat@gmail.com\r\nBcc:x@y.test",
    }).success,
    false,
  );
});
