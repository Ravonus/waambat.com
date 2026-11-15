import test from "node:test";
import assert from "node:assert/strict";
import frames from "../src/content/first-frames.json";
import display from "../src/content/display-previews.json";
import { firstFrame, firstFramePreview, videoRevealTime } from "../src/lib/first-frame";
import downloads from "../src/content/media-downloads.json";
import { resolveMediaDownload } from "../src/lib/media-download";
test("every retained movie has a sharp measured delivery preview at its original opening timestamp", () => {
  assert.equal(Object.keys(display.frames).length, Object.keys(frames.assets).length);
  const records = display.frames as Record<
    string,
    {
      asset: { quality?: string; sources: { type: string; srcset: string }[] };
      verification: {
        target: number;
        sourceSha256: string;
        frameTime: number;
        placeholder: string;
        scores: Record<string, number>[];
      };
    }
  >;
  for (const [source, id] of Object.entries(frames.sources)) {
    const delivered = records[id]!;
    assert.ok(delivered, source);
    assert.equal(delivered.asset.quality, "ssimulacra2");
    assert.equal(delivered.verification.sourceSha256, id);
    assert.equal(delivered.verification.frameTime, videoRevealTime(source));
    assert.equal(delivered.verification.placeholder, "none");
    assert.ok(delivered.verification.target >= 90);
    for (const format of delivered.asset.sources.map((s) => s.type.split("/")[1]!))
      for (const score of delivered.verification.scores)
        if (format !== "png") assert.ok(score[format]! >= 90, source);
    assert.notEqual(firstFramePreview(source), firstFrame(source));
  }
});
test("a measured movie poster still resolves to the retained original Save file", () => {
  const source = "https://i.imgur.com/7ouIHyN.mp4",
    preview = firstFramePreview(source)!;
  const file = resolveMediaDownload(downloads, {
    kind: "IMG",
    sources: [preview.src],
    owner: source,
    baseURL: "https://waamb.at/art-by-waambat",
  });
  assert.ok(file?.originalSrc?.startsWith("/media-originals/"));
  assert.equal(file?.type, "video/mp4");
  assert.notEqual(file?.src, preview.src);
});
test("every new static image rendition meets the floor; its exact fallback remains available", () => {
  for (const asset of Object.values(display.images) as {
    sources: { type: string; srcset: string }[];
    displayVerification: {
      target: number;
      scores: { type: string; width: number; score: number }[];
    };
  }[]) {
    assert.ok(asset.sources.some((s) => !s.srcset.includes("/display-previews/")));
    for (const source of asset.sources)
      for (const rung of source.srcset.split(", ")) {
        if (!rung.startsWith("/display-previews/")) continue;
        const width = Number.parseInt(rung.split(" ")[1]!);
        const score = asset.displayVerification.scores.find(
          (s) => s.width === width && s.type === source.type,
        )?.score;
        assert.ok(score !== undefined && score >= 90);
      }
  }
});
