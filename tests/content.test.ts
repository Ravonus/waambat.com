import test from "node:test";
import assert from "node:assert/strict";
import {
  contentSchema,
  mediaReferences,
  safeLink,
  embedLink,
} from "../src/lib/content";
import { detectMedia, parseRange } from "../src/lib/uploads";
import { seedContent } from "../src/content/seed";
test("seed preserves 23 paintings and original Ordinals alongside LUX and Kismet", () => {
  assert.equal(seedContent.sections[0]!.items.length, 23);
  assert.equal(seedContent.sections[1]!.items.length, 3);
  assert.equal(
    seedContent.sections[2]!.items[0]!.tokenLink,
    "https://www.satflow.com/ordinals/lux_ok_algo",
  );
  assert.equal(
    seedContent.sections[3]!.items[0]!.tokenLink,
    "https://www.satflow.com/ordinals/kismettwist",
  );
});
test("rejects unsafe links, HTML, unknown fields and duplicate IDs", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,x",
    "//evil.test",
    "https://name:pass@example.com",
    "http://example.com",
  ])
    assert.equal(safeLink.safeParse(url).success, false);
  for (const change of [
    (d: typeof seedContent) => {
      d.sections[0]!.intro = "<script>alert(1)</script>";
    },
    (d: typeof seedContent) => {
      d.sections[0]!.items[1]!.id = d.sections[0]!.items[0]!.id;
    },
  ]) {
    const doc = structuredClone(seedContent);
    change(doc);
    assert.equal(contentSchema.safeParse(doc).success, false);
  }
  assert.equal(
    contentSchema.safeParse({ ...seedContent, admin: true }).success,
    false,
  );
});
test("archived content is excluded from public media access", () => {
  const doc = structuredClone(seedContent);
  doc.sections[0]!.items[0]!.videoSrc = "/api/media/abc";
  assert.ok(mediaReferences(doc).has("/api/media/abc"));
  doc.sections[0]!.items[0]!.archived = true;
  assert.equal(mediaReferences(doc).has("/api/media/abc"), false);
});
test("migrated pages retain archive entries and reject unsafe embeds and duplicate routes", () => {
  assert.equal(seedContent.pages.length, 9);
  assert.equal(
    seedContent.pages.find((p) => p.slug === "art-by-waambat")!.archive.length,
    25,
  );
  for (const value of [
    "https://attacker.test/embed/123",
    "https://www.youtube-nocookie.com/embed/12345678901?redirect=https://attacker.test",
    "javascript:alert(1)",
    "https://player.vimeo.com/@attacker",
  ])
    assert.equal(embedLink.safeParse(value).success, false);
  assert.equal(
    embedLink.safeParse("https://www.youtube-nocookie.com/embed/T5i24dLZ9Ds")
      .success,
    true,
  );
  const duplicate = structuredClone(seedContent);
  duplicate.pages[1]!.slug = duplicate.pages[0]!.slug;
  assert.equal(contentSchema.safeParse(duplicate).success, false);
  const old = {
    sections: seedContent.sections.filter((s) => s.page !== "instagram"),
  };
  assert.deepEqual(contentSchema.parse(old).pages, []);
});
test("page media authorization follows deployed and non-archived references", () => {
  const doc = structuredClone(seedContent);
  const page = doc.pages.find((p) => p.slug === "bio-waambat")!;
  const image = page.blocks.find((b) => b.type === "image")!;
  image.src = "/api/media/page-image";
  assert.ok(mediaReferences(doc).has(image.src));
  image.archived = true;
  assert.equal(mediaReferences(doc).has(image.src), false);
});
test("validates upload signatures and HTTP byte ranges", () => {
  assert.equal(
    detectMedia(new TextEncoder().encode("<html>bad file</html>")),
    null,
  );
  assert.equal(
    detectMedia(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])),
    "image/png",
  );
  assert.deepEqual(parseRange("bytes=0-3", 10), {
    start: 0,
    end: 3,
    partial: true,
  });
  assert.deepEqual(parseRange("bytes=-3", 10), {
    start: 7,
    end: 9,
    partial: true,
  });
  for (const v of [
    "bytes=10-",
    "bytes=4-2",
    "bytes=0-1,3-4",
    "bytes=-0",
    "bytes=999999999999999999999-",
  ])
    assert.equal(parseRange(v, 10), null);
});

test("historical public links are narrowly preserved without permitting insecure media or mail injection", () => {
  for (const href of [
    "http://www.adelaandea.com/reviews/2012/ArtWynwood.html",
    "mailto:studiowaambat@gmail.com",
  ])
    assert.ok(safeLink.safeParse(href).success);
  for (const href of [
    "http://evil.test/",
    "mailto:studiowaambat@gmail.com?bcc=other@example.test",
    "mailto:studiowaambat@gmail.com%0d%0aBcc:other@example.test",
  ])
    assert.equal(safeLink.safeParse(href).success, false);
});
