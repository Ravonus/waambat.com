import test from "node:test";
import assert from "node:assert/strict";
import { contentSchema } from "../src/lib/content";
import { seedContent } from "../src/content/seed";
import {
  indexableSite,
  pageDescription,
  pageMetadata,
  publicPaths,
} from "../src/lib/seo";

test("public pages have canonical metadata and an absolute social image", () => {
  const metadata = pageMetadata(
    "/contact-waambat",
    "Contact",
    "Contact the studio.",
  );
  assert.equal(
    metadata.alternates?.canonical,
    "https://waamb.at/contact-waambat",
  );
  assert.equal(metadata.openGraph?.url, "https://waamb.at/contact-waambat");
  assert.match(
    JSON.stringify(metadata.openGraph?.images),
    /https:\/\/waamb.at\/social\/contact-waambat/,
  );
  assert.equal(
    pageMetadata("/", "Art", "Art", undefined, true).robots &&
      JSON.stringify(
        pageMetadata("/", "Art", "Art", undefined, true).robots,
      ).includes('"index":false'),
    true,
  );
});

test("preview and private builds stay out of search indexes", () => {
  const names = [
    "WAAMBAT_DEPLOY_CONTEXT",
    "WAAMBAT_PRIVATE_SITE",
    "WAAMBAT_REVIEW_BUILD",
  ] as const;
  const saved = names.map((name) => process.env[name]);
  try {
    process.env.WAAMBAT_DEPLOY_CONTEXT = "production";
    process.env.WAAMBAT_PRIVATE_SITE = "0";
    process.env.WAAMBAT_REVIEW_BUILD = "0";
    assert.equal(indexableSite(), true);
    for (const context of ["deploy-preview", "branch-deploy"]) {
      process.env.WAAMBAT_DEPLOY_CONTEXT = context;
      assert.equal(indexableSite(), false);
    }
    process.env.WAAMBAT_DEPLOY_CONTEXT = "production";
    process.env.WAAMBAT_PRIVATE_SITE = "1";
    assert.equal(indexableSite(), false);
  } finally {
    names.forEach((name, index) => {
      if (saved[index] === undefined) delete process.env[name];
      else process.env[name] = saved[index];
    });
  }
});

test("sitemap excludes archived, hidden and legacy landing pages and honors editable descriptions", () => {
  const content = contentSchema.parse(seedContent);
  const contact = content.pages.find(
    (page) => page.slug === "contact-waambat",
  )!;
  assert.match(pageDescription(contact), /Contact WAAMBAT/);
  contact.seo.description = "A custom studio description.";
  assert.equal(pageDescription(contact), contact.seo.description);
  assert.ok(publicPaths(content).includes("/contact-waambat"));
  contact.seo.noIndex = true;
  assert.ok(!publicPaths(content).includes("/contact-waambat"));
  contact.seo.noIndex = false;
  contact.archived = true;
  assert.ok(!publicPaths(content).includes("/contact-waambat"));
  assert.ok(!publicPaths(content).some((path) => path.startsWith("/admin")));
});
