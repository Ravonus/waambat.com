import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import media from "../src/content/adaptive-media.json";
import original from "../src/content/optimized-media.json";
import evidence from "../evidence/adaptive-media.json";
import { adaptiveStream, adaptivePoster } from "../src/lib/adaptive-media";
import { paintingPoster } from "../src/lib/painting-source";
import { adaptiveVideoConfig } from "../src/lib/adaptive-video-config";

test("every complete painting and hero has content-addressed adaptive renditions", () => {
  const playlists = new Set(Object.values(media.streams));
  assert.equal(
    new Set([...playlists].map((src) => path.dirname(src))).size,
    28,
  );
  for (const source of playlists) {
    const dir = path.dirname(`public${source}`);
    const digest = createHash("sha256");
    for (const file of readdirSync(dir).sort()) {
      digest.update(file);
      digest.update(readFileSync(path.join(dir, file)));
    }
    assert.equal(digest.digest("hex").slice(0, 24), path.basename(dir));
    const master = readFileSync(`public${source}`, "utf8");
    const levels = master
      .split("\n")
      .filter((line) => /^\d+\.m3u8$/.test(line));
    assert.ok(levels.length >= 2);
    const durations: number[] = [];
    for (const level of levels) {
      const playlist = readFileSync(path.join(dir, level), "utf8");
      assert.ok(
        playlist.includes("#EXT-X-ENDLIST"),
        `${source}/${level} must include its ending`,
      );
      const segments = [...playlist.matchAll(/^([^#\n]+\.m4s)$/gm)].map(
        (m) => m[1]!,
      );
      assert.ok(segments.length > 1);
      for (const file of segments)
        assert.ok(statSync(path.join(dir, file)).size > 0);
      const seconds = [...playlist.matchAll(/#EXTINF:([\d.]+)/g)].map((m) =>
        Number(m[1]),
      );
      assert.ok(
        seconds.every((n) => n <= 2.1),
        "aligned two-second quality switch points",
      );
      durations.push(seconds.reduce((a, b) => a + b, 0));
    }
    assert.ok(durations.every((n) => Math.abs(n - durations[0]!) < 0.05));
  }
  for (const painting of original.paintings) {
    assert.match(adaptiveStream(painting.mobile)!, /\/mobile\.m3u8$/);
    assert.ok(
      !readFileSync(
        `public${adaptiveStream(painting.mobile)}`,
        "utf8",
      ).includes("960.m3u8"),
    );
    assert.equal(
      adaptiveStream(painting.original),
      adaptiveStream(painting.desktop),
    );
    const checks = evidence.find((e) => e.id === painting.id)!;
    assert.ok(
      checks.levels.every((level) => level.frames === painting.frames),
      "every frame of " + painting.id,
    );
    assert.ok(checks.levels[0]!.firstSegmentBytes < painting.mobileBytes / 3);
    assert.ok(
      paintingPoster(adaptivePoster(painting.poster)).avif!.includes(
        "-768.avif",
      ),
    );
  }
});
test("adaptive loader starts small with a bounded buffer and preserves custom media", () => {
  assert.equal(adaptiveVideoConfig.startLevel, 0);
  assert.ok(adaptiveVideoConfig.maxMaxBufferLength <= 6);
  assert.equal(adaptiveVideoConfig.autoStartLoad, false);
  assert.equal(
    adaptiveStream("https://example.com/artist-edit.mp4"),
    undefined,
  );
  assert.equal(
    adaptivePoster("https://example.com/artist-edit.webp"),
    "https://example.com/artist-edit.webp",
  );
});
