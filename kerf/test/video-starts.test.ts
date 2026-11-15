import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import frames from "../src/content/first-frames.json";
import {
  firstFrame,
  firstFramePreview,
  firstFramePoster,
  videoRevealTime,
} from "../src/lib/first-frame";
import { leadingBlackEnd } from "../scripts/media/video-start.mjs";

test("only the leading black interval can delay the initial reveal", () => {
  assert.equal(leadingBlackEnd("black_start:0 black_end:0.5\nblack_start:9 black_end:12"), 0.5);
  assert.equal(leadingBlackEnd("black_start:9 black_end:12"), undefined);
  assert.equal(leadingBlackEnd("no black interval"), undefined);
});

test("black openings have full-resolution exact previews while the original frame-zero records remain intact", async () => {
  const sources = [
    "https://www.youtube.com/embed/HbP9ujYh_J4?feature=oembed",
    "https://www.youtube.com/embed/CgSaJBrjqXA?feature=oembed",
    "https://www.youtube.com/embed/Z4RYyIslgJQ?feature=oembed",
    "https://player.vimeo.com/video/115879626?app_id=122963&wmode=opaque",
  ];
  for (const source of sources) {
    const zero = firstFrame(source)!,
      preview = firstFramePreview(source)!;
    assert.ok(zero.startup?.blank);
    assert.notEqual(preview.src, zero.src);
    assert.match(preview.src, /^\/video-previews\/preview-/);
    assert.equal(preview.quality, "original");
    assert.ok(preview.width! >= 640);
    assert.ok(videoRevealTime(source) > 0);
    assert.match(firstFramePoster(source, "/fallback.jpg"), /^\/video-previews\//);
    const catalog = frames as {
      sources: Record<string, string>;
      assets: Record<string, { startup?: { verification: { frameTime: number; pixels: string } } }>;
    };
    const startup = catalog.assets[catalog.sources[source]!]!.startup!;
    assert.equal(startup.verification.frameTime, videoRevealTime(source));
    assert.equal(startup.verification.pixels, "exact");
    const stats = await sharp("public" + preview.src)
      .removeAlpha()
      .stats();
    const brightness =
      stats.channels.slice(0, 3).reduce((sum, channel) => sum + channel.mean, 0) / 3;
    assert.ok(brightness >= 8, source + " must have visible preview content");
  }
  const normal = "https://i.imgur.com/7ouIHyN.mp4";
  assert.equal(firstFramePreview(normal), firstFrame(normal));
  assert.equal(videoRevealTime(normal), 0);
});
