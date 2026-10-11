import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
const manifest = JSON.parse(
  await readFile(".next/required-server-files.json", "utf8"),
) as { config: { env: Record<string, string> } };
assert.equal(
  manifest.config.env.WAAMBAT_REVIEW_BUILD,
  "0",
  "Build a public portfolio preview; admin and draft protection is independent",
);
const origin = "http://localhost:3031";
const child = spawn(
  "node",
  ["node_modules/next/dist/bin/next", "start", "--port", "3031"],
  {
    env: {
      ...process.env,
      AUTH_SECRET: "",
      AUTH_GITHUB_ID: "",
      AUTH_GITHUB_SECRET: "",
      ADMIN_GITHUB_IDS: "",
      WAAMBAT_PRIVATE_SITE: "0",
    },
    stdio: "ignore",
  },
);
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`${origin}/admin`);
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  assert.ok(ready, "Production server started");
  for (const path of [
    "/",
    "/ordinals",
    "/mechanics",
    "/art-by-waambat",
    "/blog-press",
    "/bio-waambat",
    "/contact-waambat",
  ]) {
    const response = await fetch(`${origin}${path}`, { redirect: "manual" });
    assert.equal(response.status, 200, `${path} public portfolio`);
  }
  const draft = await fetch(`${origin}/admin/preview`, { redirect: "manual" });
  assert.equal(draft.status, 307);
  assert.equal(draft.headers.get("location"), "/admin");
  assert.equal((await fetch(`${origin}/api/admin/content`)).status, 503);
  assert.equal(
    (await fetch(`${origin}/api/admin/upload`, { method: "POST" })).status,
    503,
  );
  assert.equal(
    (await fetch(`${origin}/api/media/${"a".repeat(64)}`)).status,
    404,
  );
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(origin);
  assert.equal(await page.locator("[data-artwork]").count(), 23);
  assert.equal(await page.locator("video[src]").count(), 0);
  await page.screenshot({ path: "evidence/compiled-public-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "evidence/compiled-public-mobile.png" });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const result = {
    publicPortfolio:
      "All seven portfolio routes return 200 without authentication",
    anonymousDraftPreview: "307 to /admin",
    unconfiguredAdmin: "503, fail closed",
    anonymousMedia: "404",
    browser: "Compiled production gallery: 23 original paintings, no login/database, desktop/mobile rendered without overflow; reduced motion attached no video source",
    deployment:
      "Local compiled production server; no external deployment or credentials",
  };
  await writeFile(
    "evidence/preview-privacy.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser?.close();
  child.kill("SIGTERM");
}
