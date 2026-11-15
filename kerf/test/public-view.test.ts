import test from "node:test";
import assert from "node:assert/strict";
import { seedContent } from "../src/content/seed";
import { contentSchema } from "../src/lib/content";
import { publicContent, shellContent, routeContent } from "../src/lib/public-view";
import { addDefaultHero } from "../src/lib/hero";
import { defaultContactForm } from "../src/lib/forms";

test("public delivery excludes archived artwork and notification destinations without changing the stored document", () => {
  const original = contentSchema.parse(seedContent);
  original.email.from = "private-sender@example.com";
  original.forms = [
    {
      ...structuredClone(defaultContactForm),
      recipient: "private-recipient@example.com",
      emailNotifications: true,
    },
  ];
  original.sections[0]!.items[0]!.title = "ARCHIVED PRIVATE ARTWORK";
  original.sections[0]!.items[0]!.archived = true;
  const delivered = publicContent(original),
    json = JSON.stringify(delivered);
  assert.equal(json.includes("ARCHIVED PRIVATE ARTWORK"), false);
  assert.equal(json.includes("private-sender@example.com"), false);
  assert.equal(json.includes("private-recipient@example.com"), false);
  assert.equal(original.sections[0]!.items[0]!.title, "ARCHIVED PRIVATE ARTWORK");
  assert.equal(original.forms[0]!.recipient, "private-recipient@example.com");
});

test("the frame and destination send only the content needed to render their existing views", () => {
  const original = publicContent(addDefaultHero(contentSchema.parse(seedContent)).content);
  const shell = shellContent(original),
    route = routeContent(original, "nfts");
  const frameJSON = JSON.stringify(shell),
    routeJSON = JSON.stringify(route);
  assert.deepEqual(shell.navigation, original.navigation);
  assert.deepEqual(shell.theme, original.theme);
  assert.equal(
    shell.sections.find((section) => section.presentation === "hero")?.items[0]?.videoSrc,
    original.sections.find((section) => section.presentation === "hero")?.items[0]?.videoSrc,
  );
  assert.equal(frameJSON.includes("archive-original-4"), false);
  assert.equal(routeJSON.includes("archive-original-4"), false);
  assert.equal(
    route.sections.flatMap((section) => section.items).some((art) => art.title === "Axiom GL0w Up"),
    true,
  );
  assert.ok(frameJSON.length < JSON.stringify(original).length / 2);
  assert.equal("email" in shell, false);
  assert.equal("forms" in shell, false);
  assert.equal("pages" in route, false);
  assert.equal("email" in route, false);
});
