import test from "node:test";
import assert from "node:assert/strict";
import { sourceImageSet } from "../src/lib/source-image";
test("animated image containers retain exact source URLs without rendition flattening", () => {
  for (const extension of ["gif", "png", "apng", "webp", "GIF"]) {
    const src = `https://images.squarespace-cdn.com/content/art.${extension}?original=1`;
    assert.deepEqual(sourceImageSet(src), { src, srcSet: undefined });
  }
  assert.equal(sourceImageSet("/original.gif").src, "/original.gif");
});
test("JPEG renditions keep one width parameter and preserve other source parameters", () => {
  const source = sourceImageSet(
    "https://images.squarespace-cdn.com/content/portrait.JPG?format=2500w&original=1",
  );
  const url = new URL(source.src);
  assert.equal(url.searchParams.get("original"), "1");
  assert.deepEqual(url.searchParams.getAll("format"), ["1000w"]);
  assert.equal(source.srcSet?.split(", ").length, 5);
});
