import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { imageIndex } from "../scripts/media/image-index.mjs";

test("image delivery keeps motion and original save metadata while leaving movies and blur payloads out", () => {
  const source = {
    movie: { kind: "video", type: "video/mp4", src: "/original.mp4" },
    artwork: {
      kind: "graphic",
      type: "image/gif",
      src: "/loop.gif",
      animated: true,
      placeholder: "data:blur",
      original: { src: "/exact.gif", bytes: 123 },
      sources: [{ type: "image/webp", srcset: "/animated.webp 640w" }],
    },
  };
  const result = imageIndex(source);
  assert.equal(result.movie, undefined);
  assert.equal(result.artwork.animated, true);
  assert.deepEqual(result.artwork.original, { src: "/exact.gif", bytes: 123 });
  assert.deepEqual(result.artwork.sources, source.artwork.sources);
  assert.equal("placeholder" in result.artwork, false);
  assert.equal(source.artwork.placeholder, "data:blur");
});

test("the committed browser image catalog matches the encoder inventory and is smaller", () => {
  const source = readFileSync("src/content/local-media.json", "utf8");
  const image = readFileSync("src/content/image-media.json", "utf8");
  const display = JSON.parse(readFileSync("src/content/display-previews.json", "utf8"));
  assert.deepEqual(JSON.parse(image), imageIndex({ ...JSON.parse(source), ...display.images }));
  assert.ok(Buffer.byteLength(image) < Buffer.byteLength(source) * 0.7);
  assert.ok(gzipSync(image).length < gzipSync(source).length * 0.7);
  assert.equal(image.includes("displayVerification"), false);
});

test("the browser video index excludes encoding receipts and exact-source provenance", () => {
  const video = readFileSync("src/content/video-previews.json", "utf8");
  const runtime = JSON.parse(video),
    display = JSON.parse(readFileSync("src/content/display-previews.json", "utf8"));
  assert.equal(Object.keys(runtime.assets).length, Object.keys(display.frames).length);
  assert.ok(Buffer.byteLength(video) < 130000);
  assert.equal(video.includes('"verification"'), false);
  assert.equal(video.includes('"images"'), false);
  for (const [id, record] of Object.entries(display.frames) as [
    string,
    { asset: { src: string; sources: unknown[] } },
  ][]) {
    assert.equal(runtime.assets[id].src, record.asset.src);
    assert.deepEqual(runtime.assets[id].sources, record.asset.sources);
  }
});
