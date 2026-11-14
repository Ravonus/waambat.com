import test from "node:test";
import assert from "node:assert/strict";
import { themeSchema, themeStyle } from "../src/lib/theme";
import { archiveRows } from "../src/lib/archive-layout";
import { seedContent } from "../src/content/seed";
import { testSiteConfigured } from "../src/lib/test-site";
test("filled form actions use readable text after changing theme colors", () => {
  for (const [link, foreground] of [
    ["#9457ff", "#000000"],
    ["#000000", "#ffffff"],
    ["#ffffff", "#000000"],
    ["#0000ff", "#ffffff"],
  ]) {
    const style = themeStyle(
      themeSchema.parse({ link, linkHover: link }),
    ) as Record<string, string>;
    assert.equal(style["--site-action-text"], foreground);
    assert.equal(style["--site-action-hover-text"], foreground);
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
