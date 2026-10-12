import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { contentSchema } from "../src/lib/content";
import {
  correctLegacyOrdinalSources,
  LUX_PLAYER,
  KISMET_PLAYER,
} from "../src/lib/ordinal-sources";
import { videoSource } from "../src/lib/video-source";

async function oldContent() {
  const content = contentSchema.parse(
    JSON.parse(await readFile("src/content/site.json", "utf8")),
  );
  content.ordinalSourceVersion = 0;
  const lux = content.sections.find((section) => section.id === "lux")!
    .items[0]!;
  Object.assign(lux, {
    kind: "image",
    videoSrc: "",
    description: "The OK Algo facet · Explore LUX on Satflow",
  });
  const kismet = content.sections.find(
    (section) => section.id === "kismet-twist",
  )!.items[0]!;
  Object.assign(kismet, {
    videoSrc:
      "https://ordinals.com/preview/383773bbfe98f8fecef04f65c3bbf56fbdc044cb3cdeaf2eb546d140adac5162i98",
    description:
      "Explore the Kismet Twist collection on Satflow. The optional on-chain preview is Kismet Twist #100, attributed to WAAMBAT with Ravonus as technomancer in its inscription metadata.",
  });
  return content;
}
test("verified live players upgrade only legacy defaults without mutating persisted input", async () => {
  const old = await oldContent();
  const before = structuredClone(old);
  old.sections.find((section) => section.id === "lux")!.items[0]!.archived =
    true;
  before.sections.find((section) => section.id === "lux")!.items[0]!.archived =
    true;
  const result = correctLegacyOrdinalSources(old);
  assert.equal(result.changed, true);
  assert.deepEqual(old, before);
  contentSchema.parse(result.content);
  const lux = result.content.sections.find((section) => section.id === "lux")!
    .items[0]!;
  assert.equal(lux.videoSrc, LUX_PLAYER);
  assert.equal(lux.kind, "embed");
  assert.equal(lux.archived, true);
  assert.equal(
    result.content.sections.find((section) => section.id === "kismet-twist")!
      .items[0]!.videoSrc,
    KISMET_PLAYER,
  );
  assert.deepEqual(result.content.pages, before.pages);
  assert.deepEqual(
    result.content.sections.filter(
      (section) => !["lux", "kismet-twist"].includes(section.id),
    ),
    before.sections.filter(
      (section) => !["lux", "kismet-twist"].includes(section.id),
    ),
  );
  assert.equal(correctLegacyOrdinalSources(result.content).changed, false);
});
test("artist-selected media and captions are never replaced by source compatibility", async () => {
  const old = await oldContent();
  old.sections.find((section) => section.id === "lux")!.items[0]!.poster =
    "https://artist.example/original.webp";
  old.sections.find(
    (section) => section.id === "kismet-twist",
  )!.items[0]!.description = "My selected #100 edition";
  const result = correctLegacyOrdinalSources(old);
  assert.equal(result.changed, false);
  assert.deepEqual(result.content.sections, old.sections);
  assert.equal(result.content.ordinalSourceVersion, 1);
});
test("after migration the artist can deliberately restore a static or alternate sample", async () => {
  const result = correctLegacyOrdinalSources(await oldContent()).content;
  const lux = result.sections.find((section) => section.id === "lux")!
    .items[0]!;
  Object.assign(lux, {
    kind: "image",
    videoSrc: "",
    description: "The OK Algo facet · Explore LUX on Satflow",
  });
  const chosen = correctLegacyOrdinalSources(result);
  assert.equal(chosen.changed, false);
  assert.equal(chosen.content, result);
  assert.equal(lux.kind, "image");
  assert.equal(lux.videoSrc, "");
});
test("exact confirmed HTML content routes are players; injected queries and lookalike hosts are rejected", () => {
  for (const source of [LUX_PLAYER, KISMET_PLAYER]) {
    assert.equal(videoSource(source)?.provider, "ordinals");
    assert.equal(videoSource(source)?.direct, false);
    assert.equal(videoSource(source)?.player, source);
    assert.equal(videoSource(source + "?redirect=https://evil.test"), null);
    assert.equal(
      videoSource(source.replace("ordinals.com", "ordinals.com.evil.test")),
      null,
    );
  }
});
