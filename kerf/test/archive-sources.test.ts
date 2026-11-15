import test from "node:test";
import assert from "node:assert/strict";
import { contentSchema } from "../src/lib/content";
import { seedContent } from "../src/content/seed";
import { recoverArchiveSources } from "../src/lib/archive-sources";

function legacyContent() {
  const content = contentSchema.parse(seedContent);
  content.archiveSourceVersion = 0;
  const archive = content.pages.find((page) => page.slug === "art-by-waambat")!.archive;
  for (const art of archive) art.previewOnly = false;
  archive.find((art) => art.id === "archive-original-1")!.embed =
    "https://player.vimeo.com/video/538169390?app_id=122963&wmode=opaque";
  archive.find((art) => art.id === "archive-original-2")!.embed =
    "https://player.vimeo.com/video/543748855?app_id=122963&wmode=opaque";
  return content;
}

test("retired Axiom and Sus archive embeds use the retained copies of those paintings", () => {
  const original = legacyContent();
  const repaired = recoverArchiveSources(original);
  const archive = repaired.content.pages.find((page) => page.slug === "art-by-waambat")!.archive;
  assert.equal(repaired.changed, true);
  assert.equal(
    archive.find((art) => art.id === "archive-original-1")!.embed,
    "https://i.imgur.com/7ouIHyN.mp4",
  );
  assert.equal(
    archive.find((art) => art.id === "archive-original-2")!.embed,
    "https://i.imgur.com/b8XNIJY.mp4",
  );
  assert.match(
    original.pages.find((page) => page.slug === "art-by-waambat")!.archive[0]!.embed,
    /vimeo/,
  );
  assert.equal(recoverArchiveSources(repaired.content).changed, false);
  assert.equal(contentSchema.safeParse(repaired.content).success, true);
});

test("archive source repairs preserve artist replacements and every other artwork", () => {
  const original = recoverArchiveSources(legacyContent()).content;
  const archive = original.pages.find((page) => page.slug === "art-by-waambat")!.archive;
  archive[0]!.embed = "https://example.com/artist-replacement.mp4";
  archive[1]!.embed = "https://example.com/another-replacement.mp4";
  const result = recoverArchiveSources(original);
  assert.equal(result.changed, false);
  assert.equal(result.content, original);
  assert.deepEqual(result.content.pages, original.pages);
});

test("unavailable provider entries keep their thumbnails without attaching a player", () => {
  const original = legacyContent();
  for (const page of original.pages) for (const art of page.archive) art.archived = false;
  const mechanics = original.pages.find((page) => page.slug === "mechanics")!;
  for (const block of mechanics.blocks) block.archived = false;
  const archive = recoverArchiveSources(original).content.pages.find(
    (page) => page.slug === "art-by-waambat",
  )!.archive;
  assert.equal(archive.length, 25);
  assert.equal(archive.filter((art) => art.archived).length, 0);
  assert.equal(archive.filter((art) => art.previewOnly).length, 13);
  assert.equal(archive.find((art) => art.id === "archive-original-3")!.previewOnly, true);
  assert.equal(archive.find((art) => art.id === "archive-original-7")!.previewOnly, true);
  assert.equal(
    recoverArchiveSources(original)
      .content.pages.find((page) => page.slug === "mechanics")!
      .blocks.find((block) => block.src === "https://i.imgur.com/3hhNUKR.mp4")!.archived,
    true,
  );
  for (const id of [1, 2, 4, 5, 6, 8, 12, 15, 18, 19, 23, 25])
    assert.equal(archive.find((art) => art.id === `archive-original-${id}`)!.previewOnly, false);
  const customized = original.pages.find((page) => page.slug === "art-by-waambat")!.archive[2]!;
  customized.embed = "https://example.com/restored-original.mp4";
  assert.equal(
    recoverArchiveSources(original).content.pages.find((page) => page.slug === "art-by-waambat")!
      .archive[2]!.archived,
    false,
  );
  const restored = recoverArchiveSources(original).content;
  restored.pages.find((page) => page.slug === "art-by-waambat")!.archive[6]!.archived = false;
  assert.equal(
    recoverArchiveSources(restored).content.pages.find((page) => page.slug === "art-by-waambat")!
      .archive[6]!.archived,
    false,
  );
});

test("the version-one removal is restored once, preserving later artist choices", () => {
  const original = legacyContent();
  original.archiveSourceVersion = 1;
  const archive = original.pages.find((page) => page.slug === "art-by-waambat")!.archive;
  const removed = [3, 7, 9, 10, 11, 13, 14, 16, 17, 20, 21, 22, 24];
  for (const id of removed)
    archive.find((art) => art.id === `archive-original-${id}`)!.archived = true;
  const restored = recoverArchiveSources(original).content;
  const entries = restored.pages.find((page) => page.slug === "art-by-waambat")!.archive;
  assert.equal(restored.archiveSourceVersion, 2);
  assert.equal(entries.filter((art) => art.previewOnly && !art.archived).length, 13);
  assert.equal(entries.length, 25);
  const chosen = entries.find((art) => art.id === "archive-original-3")!;
  chosen.archived = true;
  chosen.previewOnly = false;
  chosen.embed = "https://example.com/recovered-video.mp4";
  const result = recoverArchiveSources(restored);
  assert.equal(result.changed, false);
  assert.equal(result.content, restored);
  assert.deepEqual(result.content.pages, restored.pages);
  assert.equal(contentSchema.safeParse(restored).success, true);
});
