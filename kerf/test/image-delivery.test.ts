import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  assert.deepEqual(JSON.parse(image), imageIndex(JSON.parse(source)));
  assert.ok(Buffer.byteLength(image) < Buffer.byteLength(source) * 0.7);
});
