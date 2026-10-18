import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import manifest from "../src/content/optimized-media.json";
import { seedContent } from "../src/content/seed";
import { contentSchema } from "../src/lib/content";
import { optimizeStoredMedia } from "../src/lib/optimized-media";
import { paintingPoster } from "../src/lib/painting-source";

test("all painting display files and responsive posters exist and have versioned cache identities", () => {
  assert.equal(manifest.paintings.length, 23);
  for (const item of manifest.paintings) {
    assert.equal(item.available, true, item.id);
    for (const field of ["desktop", "mobile"] as const) {
      assert.match(item[field], /^\/paintings\/[a-f0-9]{24}\.mp4$/);
      assert.equal(
        statSync(`public${item[field]}`).size,
        item[`${field}Bytes`],
      );
      assert.ok(item[`${field}Bytes`] < item.originalBytes, item.id);
    }
    const hash = item.poster.match(/[a-f0-9]{24}/)![0];
    const bytes = [384, 640, 960].flatMap((width) =>
      ["webp", "avif"].map((ext) =>
        readFileSync(`public/paintings/${hash}-${width}.${ext}`),
      ),
    );
    assert.equal(
      createHash("sha256")
        .update(Buffer.concat(bytes))
        .digest("hex")
        .slice(0, 24),
      hash,
    );
    assert.ok(paintingPoster(item.poster).avif);
  }
  assert.equal(Object.keys(manifest.hero).length, 6);
  for (const [original, copy] of Object.entries(manifest.hero))
    assert.deepEqual(
      readFileSync(`public${original}`),
      readFileSync(`public${copy}`),
    );
});

test("media migration preserves original token links and artist-edited display sources", () => {
  const seed = contentSchema.parse(seedContent);
  const first = seed.sections[0]!.items[0]!;
  first.previewSrc = "https://example.com/custom.mp4";
  first.poster = "https://example.com/custom.webp";
  const upgraded = optimizeStoredMedia(seed);
  assert.equal(upgraded.changed, true);
  const item = upgraded.content.sections[0]!.items[0]!;
  assert.equal(item.previewSrc, first.previewSrc);
  assert.equal(item.poster, first.poster);
  assert.equal(item.videoSrc, first.videoSrc);
  assert.equal(item.tokenLink, first.tokenLink);
  assert.ok(item.mobileVideoSrc.startsWith("/paintings/"));
  assert.equal(optimizeStoredMedia(upgraded.content).changed, false);
  assert.equal(contentSchema.safeParse(upgraded.content).success, true);
});
