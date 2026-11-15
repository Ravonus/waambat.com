import test from "node:test";
import assert from "node:assert/strict";
import { contentSchema } from "../src/lib/content";
import { seedContent } from "../src/content/seed";
import { recoverArchiveSources } from "../src/lib/archive-sources";

test("retired Axiom and Sus archive embeds use the retained copies of those paintings", () => {
  const original = contentSchema.parse(seedContent);
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
  const original = recoverArchiveSources(contentSchema.parse(seedContent)).content;
  const archive = original.pages.find((page) => page.slug === "art-by-waambat")!.archive;
  archive[0]!.embed = "https://example.com/artist-replacement.mp4";
  archive[1]!.embed = "https://example.com/another-replacement.mp4";
  const result = recoverArchiveSources(original);
  assert.equal(result.changed, false);
  assert.equal(result.content, original);
  assert.deepEqual(result.content.pages, original.pages);
});

test("unavailable provider entries are archived while working videos and still artwork remain", () => {
  const original = contentSchema.parse(seedContent);
  for (const page of original.pages) for (const art of page.archive) art.archived = false;
  const mechanics = original.pages.find((page) => page.slug === "mechanics")!;
  for (const block of mechanics.blocks) block.archived = false;
  const archive = recoverArchiveSources(original).content.pages.find(
    (page) => page.slug === "art-by-waambat",
  )!.archive;
  assert.equal(archive.filter((art) => art.archived).length, 13);
  assert.equal(archive.find((art) => art.id === "archive-original-3")!.archived, true);
  assert.equal(archive.find((art) => art.id === "archive-original-7")!.archived, true);
  assert.equal(
    recoverArchiveSources(original)
      .content.pages.find((page) => page.slug === "mechanics")!
      .blocks.find((block) => block.src === "https://i.imgur.com/3hhNUKR.mp4")!.archived,
    true,
  );
  for (const id of [1, 2, 4, 5, 6, 8, 12, 15, 18, 19, 23, 25])
    assert.equal(archive.find((art) => art.id === `archive-original-${id}`)!.archived, false);
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
