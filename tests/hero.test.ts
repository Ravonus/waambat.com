import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import {
  contentSchema,
  mediaReferences,
  type Content,
} from "../src/lib/content";
import {
  activeHero,
  addDefaultHero,
  defaultHeroSection,
  HERO_SECTION_ID,
} from "../src/lib/hero";
import { originalTheme, themeSchema, themeStyle } from "../src/lib/theme";
import { videoSource } from "../src/lib/video-source";

async function stored() {
  return contentSchema.parse(
    JSON.parse(await readFile("src/content/site.json", "utf8")),
  );
}
// Content as the studio stored it before the banner existed.
async function legacy(): Promise<Content> {
  const content = await stored();
  content.heroVersion = 0;
  content.sections = content.sections.filter((s) => s.id !== HERO_SECTION_ID);
  return content;
}
const hero = (content: Content) =>
  content.sections.find((s) => s.id === HERO_SECTION_ID)!;

test("the shipped content carries the home hero banner", async () => {
  const content = await stored();
  assert.equal(content.heroVersion, 1);
  assert.ok(content.sections.some((s) => s.id === HERO_SECTION_ID));
  const live = activeHero(content, "nfts")!;
  assert.equal(live.section.presentation, "hero");
  assert.equal(live.item.videoSrc, "/hero/waambat-hero-desktop.mp4");
  assert.equal(live.item.mobileVideoSrc, "/hero/waambat-hero-mobile.mp4");
  assert.equal(activeHero(content, "ordinals"), null);
});

test("hero media exists, loads as a direct source and fits the studio's upload limit", async () => {
  const live = activeHero(await stored(), "nfts")!.item;
  for (const reference of [
    live.videoSrc,
    live.mobileVideoSrc,
    live.poster,
    live.mobilePoster,
  ]) {
    assert.ok(reference.startsWith("/hero/"), reference);
    const { size } = await stat(`public${reference}`);
    assert.ok(size > 10_000, `${reference} is empty`);
    assert.ok(
      size <= 4 * 1024 * 1024,
      `${reference} exceeds the 4 MB upload cap`,
    );
  }
  assert.equal(videoSource(live.videoSrc)?.direct, true);
  assert.equal(videoSource(live.mobileVideoSrc)?.direct, true);
});

test("seeded hero matches the default added to older stores", async () => {
  const seeded = hero(await stored());
  const added = defaultHeroSection();
  assert.deepEqual(seeded, added);
});

test("older stored content gains the hero on read, without being written back or mutated", async () => {
  const old = await legacy();
  const before = structuredClone(old);
  const result = addDefaultHero(old);
  assert.equal(result.changed, true);
  assert.equal(result.content.heroVersion, 1);
  assert.equal(result.content.sections.at(-1)!.id, HERO_SECTION_ID);
  assert.equal(result.content.sections.length, old.sections.length + 1);
  assert.deepEqual(old, before);
  assert.doesNotThrow(() => contentSchema.parse(result.content));
  const again = addDefaultHero(result.content);
  assert.equal(again.changed, false);
  assert.equal(again.content, result.content);
});

test("an archived or artist-edited hero is respected, never replaced or restored", async () => {
  const archived = await legacy();
  archived.sections.push({ ...defaultHeroSection(), archived: true });
  const kept = addDefaultHero(archived);
  assert.equal(kept.changed, false);
  assert.equal(kept.content.heroVersion, 1);
  assert.equal(
    kept.content.sections.filter((s) => s.presentation === "hero").length,
    1,
  );
  assert.equal(activeHero(kept.content, "nfts"), null);

  const edited = await legacy();
  const mine = defaultHeroSection();
  mine.title = "my banner";
  mine.items[0]!.videoSrc = "/hero/mine.mp4";
  edited.sections.push(mine);
  const result = addDefaultHero(edited);
  assert.equal(result.changed, false);
  assert.equal(hero(result.content).title, "my banner");
  assert.equal(hero(result.content).items[0]!.videoSrc, "/hero/mine.mp4");
});

test("a hero the artist moved to another page, or whose video they archived, no longer shows on home", async () => {
  const content = await stored();
  hero(content).page = "ordinals";
  assert.equal(activeHero(content, "nfts"), null);
  assert.ok(activeHero(content, "ordinals"));
  hero(content).page = "nfts";
  hero(content).items[0]!.archived = true;
  assert.equal(activeHero(content, "nfts"), null);
});

test("a hero with neither video nor poster is hidden; a poster alone still shows", async () => {
  const content = await stored();
  const item = hero(content).items[0]!;
  item.videoSrc = "";
  assert.ok(activeHero(content, "nfts"));
  item.poster = "";
  assert.equal(activeHero(content, "nfts"), null);
});

test("the hero never renders as an ordinary gallery section", async () => {
  const gallery = await readFile("src/app/components/Gallery.tsx", "utf8");
  assert.match(gallery, /presentation !== "hero"/);
});

test("hero media references are tracked so uploads are kept and checked", async () => {
  const content = await stored();
  const references = mediaReferences(content);
  for (const reference of [
    "/hero/waambat-hero-desktop.mp4",
    "/hero/waambat-hero-mobile.mp4",
    "/hero/waambat-hero-poster.webp",
    "/hero/waambat-hero-poster-mobile.webp",
  ])
    assert.ok(references.has(reference), reference);
  const withLogo = await stored();
  hero(withLogo).items[0]!.logoSrc = "/api/media/" + "a".repeat(64);
  assert.ok(mediaReferences(withLogo).has("/api/media/" + "a".repeat(64)));
});

test("hero video paths are same-origin render files only", () => {
  for (const ok of ["/hero/waambat-hero-desktop.mp4", "/hero/a.webm"])
    assert.equal(videoSource(ok)?.direct, true, ok);
  for (const bad of [
    "/hero/../etc/passwd.mp4",
    "/hero/a.exe",
    "/hero/A.mp4",
    "//evil.example/hero/a.mp4",
    "/hero/a.mp4?x=1",
    "/hero/sub/a.mp4",
    "/heroes/a.mp4",
    "/hero/.mp4",
  ])
    assert.equal(videoSource(bad)?.direct === true, false, bad);
});

test("theme motion and wordmark size are bounded, defaulted and exposed as tokens", () => {
  assert.equal(originalTheme.motion, "full");
  assert.equal(originalTheme.heroWordmarkScale, 100);
  for (const motion of ["full", "calm", "off"])
    assert.equal(themeSchema.safeParse({ motion }).success, true, motion);
  for (const bad of [
    { motion: "wild" },
    { heroWordmarkScale: 59 },
    { heroWordmarkScale: 161 },
  ])
    assert.equal(themeSchema.safeParse(bad).success, false);
  const style = themeStyle(themeSchema.parse({ heroWordmarkScale: 120 }));
  assert.equal(
    (style as Record<string, unknown>)["--site-hero-wordmark-scale"],
    1.2,
  );
});

test("a store saved before the hero fields existed still parses with safe defaults", async () => {
  const raw = JSON.parse(await readFile("src/content/site.json", "utf8"));
  delete raw.heroVersion;
  for (const section of raw.sections)
    for (const item of section.items) {
      delete item.mobilePoster;
      delete item.mobileAspectRatio;
      delete item.logoSrc;
    }
  const parsed = contentSchema.parse(raw);
  assert.equal(parsed.heroVersion, 0);
  assert.equal(parsed.sections[0]!.items[0]!.logoSrc, "");
  assert.equal(parsed.sections[0]!.items[0]!.mobilePoster, "");
});
