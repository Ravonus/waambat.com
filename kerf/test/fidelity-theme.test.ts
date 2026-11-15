import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  accentFamily,
  canonicalAccent,
  contrast,
  originalTheme,
  themeColors,
  themeSchema,
  themeStyle,
} from "../src/lib/theme";
import { archiveRows } from "../src/lib/archive-layout";
import { seedContent } from "../src/content/seed";
import { testSiteConfigured } from "../src/lib/test-site";
test("filled form actions use readable text after changing theme colors", () => {
  for (const [link, foreground] of [
    ["#8a4dff", "#000000"],
    ["#e1bcc2", "#221014"],
    ["#000000", "#ffffff"],
    ["#ffffff", "#161616"],
    ["#0000ff", "#ffffff"],
  ]) {
    const style = themeStyle(
      themeSchema.parse({ link, linkHover: link }),
    ) as Record<string, string>;
    assert.equal(style["--ui-accent"], link);
    assert.equal(style["--ui-on-accent"], foreground);
    assert.ok(contrast(style["--ui-on-accent"]!, link) >= 4.5, link);
    assert.ok(contrast(style["--ui-on-accent-hover"]!, link) >= 4.5, link);
  }
});
test("one pastel accent family derives every interactive state from the heading pink", () => {
  // Titles, the wordmark and the cursor share the wordmark pink; interactive UI is pastel.
  assert.equal(originalTheme.heading, "#ff94b2");
  assert.equal(originalTheme.logo, "#ff94b2");
  assert.equal(originalTheme.link, canonicalAccent);
  const cursor = themeStyle(originalTheme) as Record<string, string>;
  assert.deepEqual(
    [cursor["--ui-cursor"], cursor["--ui-cursor-light"], cursor["--ui-cursor-deep"]],
    ["#ff94b2", "#ffb5c8", "#e27092"],
  );
  assert.deepEqual(accentFamily(canonicalAccent), {
    base: "#e1bcc2",
    hover: "#f1d1d6",
    pressed: "#c39ca2",
    focus: "#e1bcc2",
    border: "#715e61",
    surface: "#120f10",
    surfaceStrong: "#201a1b",
    disabled: "#5a4b4e",
    onAccent: "#221014",
  });
  // Unset hovers are derived: link hover from the link, navigation hover from the logo.
  assert.equal(originalTheme.linkHover, undefined);
  assert.equal(originalTheme.navigationHover, undefined);
  assert.deepEqual(themeColors(originalTheme), {
    linkHover: "#f1d1d6",
    navigationHover: "#ff94b2",
  });
  const family = accentFamily(canonicalAccent);
  for (const shade of [family.base, family.hover, family.pressed, family.focus])
    assert.ok(contrast(shade, "#000000") >= 7, shade);
  assert.ok(contrast(family.border, "#000000") >= 3);
  assert.ok(contrast(family.onAccent, family.base) >= 7);
  assert.ok(contrast(family.onAccent, family.hover) >= 7);
});
test("CSS defaults equal the theme's derived tokens", () => {
  const css = readFileSync(new URL("../src/styles/globals.css", import.meta.url), "utf8");
  const style = themeStyle(originalTheme) as Record<string, string>;
  const names = [...css.matchAll(/^\s*(--(?:ui-[a-z-]+|color-waambat-[a-z-]+)):\s*([^;]+);/gm)];
  assert.ok(names.length >= 14);
  for (const [, name, value] of names) assert.equal(value!.trim(), style[name!], name);
});
test("stored legacy accent defaults read as the pastel family; chosen colours and other settings stay", () => {
  const legacy = themeSchema.parse({
    heading: "#E1BCC2",
    link: "#9457ff",
    linkHover: "#FF7070",
    navigationHover: "#fa75d0",
    logo: "#ff94b2",
    bodySize: 16,
    motion: "calm",
  });
  assert.equal(legacy.heading, "#ff94b2");
  assert.equal(legacy.link, "#e1bcc2");
  assert.equal(legacy.linkHover, undefined);
  assert.equal(legacy.navigationHover, undefined);
  assert.deepEqual(themeColors(legacy), {
    linkHover: "#f1d1d6",
    navigationHover: "#ff94b2",
  });
  assert.equal(legacy.accentVersion, 2);
  assert.equal(legacy.logo, "#ff94b2");
  assert.equal(legacy.bodySize, 16);
  assert.equal(legacy.motion, "calm");
  const chosen = themeSchema.parse({ link: "#00aa88", linkHover: "#112233" });
  assert.equal(chosen.link, "#00aa88");
  assert.equal(chosen.linkHover, "#112233");
});
test("no legacy violet/coral hue remains anywhere in the UI", () => {
  const legacy = /#(9457ff|ff7070|fa75d0|ff70ba|ffadd1|c60064|ff70c5|ffb2d1|ffbfd8|180c14|120b10)/i;
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(css|tsx)$/.test(name) || path.endsWith("cursor.ts")) files.push(path);
    }
  };
  walk(new URL("../src", import.meta.url).pathname);
  for (const file of files) {
    // The semantic error colour is defined once, as a token.
    const source = readFileSync(file, "utf8")
      .replace("--ui-danger: #ff7070;", "");
    assert.doesNotMatch(source, legacy, file);
  }
});
test("theme rejects arbitrary styles, external fonts and unsafe or unbounded values", () => {
  for (const value of [
    { heading: "url(javascript:alert(1))" },
    { font: "https://example.com/font.woff" },
    { contentWidth: 100000 },
    { tracking: -1 },
    { css: "body{}" },
  ])
    assert.equal(themeSchema.safeParse(value).success, false);
});
test("archive preserves all 25 source tiles and measured desktop row starts", () => {
  const items = seedContent.pages.find(
    (p) => p.slug === "art-by-waambat",
  )!.archive;
  const expected = [
    181.703125, 782.421875, 1236.640625, 1764.890625, 2293.140625, 2747.3515625,
    3201.5703125, 3994.5703125, 4448.78125, 5241.78125, 5695.9921875,
    6488.9921875, 6943.2109375, 7454.265625,
  ];
  let top = expected[0]!;
  const rows = archiveRows(items, 1392);
  assert.equal(rows.flatMap((r) => r.items).length, 25);
  rows.forEach((row, i) => {
    assert.ok(Math.abs(top - expected[i]!) < 0.01);
    top += row.height + 10;
  });
  assert.ok(
    archiveRows(items, 350).every(
      (row) => row.items.length === 1 && row.height > 0,
    ),
  );
});
test("requested test account never activates on the original domain or arbitrary hosts", () => {
  const env = {
    ADMIN_TEST_LOGIN: "1",
    CMS_CONTENT_PROVIDER: "netlify-blobs",
    AUTH_URL: "https://waambat.netlify.app",
  };
  assert.equal(testSiteConfigured(env), true);
  for (const origin of [
    "https://waambat.com",
    "https://waambat.netlify.app.evil.test",
    "http://waambat.netlify.app",
    "https://user:pass@waambat.netlify.app",
  ])
    assert.equal(testSiteConfigured({ ...env, AUTH_URL: origin }), false);
  assert.equal(testSiteConfigured({ ...env, ADMIN_TEST_LOGIN: "0" }), false);
});
test("a version-2 theme is never migrated, so a deliberate legacy colour survives a save round trip", () => {
  const chosen = themeSchema.parse({
    accentVersion: 2,
    heading: "#e1bcc2",
    link: "#9457ff",
    linkHover: "#ff7070",
    navigationHover: "#fa75d0",
  });
  assert.equal(chosen.heading, "#e1bcc2");
  assert.equal(chosen.link, "#9457ff");
  assert.equal(chosen.linkHover, "#ff7070");
  assert.equal(chosen.navigationHover, "#fa75d0");
  // What the admin saves is read back unchanged.
  assert.deepEqual(themeSchema.parse(JSON.parse(JSON.stringify(chosen))), chosen);
  // A migrated legacy theme is stamped, so a later save never re-migrates it.
  const migrated = themeSchema.parse({ heading: "#e1bcc2" });
  assert.equal(migrated.accentVersion, 2);
  assert.equal(themeSchema.parse({ ...migrated, heading: "#e1bcc2" }).heading, "#e1bcc2");
});
test("an unset hover follows a custom link colour; navigation hover follows the logo", () => {
  const custom = themeSchema.parse({ link: "#00aa88", logo: "#33ccff" });
  const style = themeStyle(custom) as Record<string, string>;
  assert.equal(style["--ui-accent"], "#00aa88");
  assert.equal(style["--ui-accent-hover"], accentFamily("#00aa88").hover);
  assert.notEqual(style["--ui-accent-hover"], "#f1d1d6");
  assert.equal(style["--ui-accent-nav-hover"], "#33ccff");
});
test("every hard-coded colour fallback for a theme token equals the theme default", () => {
  const style = themeStyle(originalTheme) as Record<string, string>;
  const long = (hex: string) =>
    hex.length === 4 ? "#" + [...hex.slice(1)].map((c) => c + c).join("") : hex;
  const root = new URL("../src/", import.meta.url).pathname;
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(css|tsx?)$/.test(name)) files.push(path);
    }
  };
  walk(root);
  let checked = 0;
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const [, name, hex] of source.matchAll(
      /(?:var\(|token\(')(--(?:ui-[a-z-]+|color-waambat-[a-z-]+|site-background|site-body))'?,\s*'?(#[0-9a-fA-F]{3,6})\b/g,
    )) {
      checked++;
      assert.equal(long(hex!.toLowerCase()), style[name!], `${file}: ${name}`);
    }
  }
  assert.ok(checked >= 10, `only ${checked} fallbacks found`);
});
test("an unexpected accent version never fails the content store", () => {
  for (const accentVersion of [null, 1, 2.5, "2"])
    assert.equal(themeSchema.parse({ accentVersion }).accentVersion, 2, String(accentVersion));
  assert.equal(themeSchema.parse({ accentVersion: 3 }).accentVersion, 3);
});
