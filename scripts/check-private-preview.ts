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
    "/instagram",
    "/waambat",
    "/lindsay-scoggins",
    "/art",
  ]) {
    const response = await fetch(`${origin}${path}`, { redirect: "manual" });
    assert.equal(response.status, 200, `${path} public portfolio`);
  }
  const alias = await fetch(`${origin}/nfts-copy`, { redirect: "manual" });
  assert.equal(alias.status, 308);
  assert.equal(alias.headers.get("location"), "/");
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
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  await page.goto(origin);
  assert.equal(await page.locator("[data-artwork]").count(), 23);
  assert.equal(await page.locator("video[src]").count(), 0);
  await page.screenshot({ path: "evidence/compiled-public-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "evidence/compiled-public-mobile.png" });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.route("https://player.vimeo.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<p>Controlled Vimeo destination fixture</p>",
    }),
  );
  await page.route("https://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<p>Controlled YouTube destination fixture</p>",
    }),
  );
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const path of [
      "/bio-waambat",
      "/instagram",
      "/waambat",
      "/lindsay-scoggins",
      "/art",
    ]) {
      await page.goto(`${origin}${path}`);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} no horizontal overflow`,
      );
    }
    assert.equal(await page.locator("[data-artwork]").count(), 4);
    assert.equal(
      await page.locator("video[src]").count(),
      0,
      "Legacy loops honor reduced motion",
    );
    await page.goto(`${origin}/instagram`);
    assert.equal(await page.locator("article figure").count(), 32);
    assert.equal(await page.locator("[data-instagram]").count(), 8);
    assert.equal(await page.locator("iframe").count(), 0);
    assert.equal(
      await page
        .locator("article")
        .first()
        .evaluate((e) => getComputedStyle(e).display),
      "grid",
    );
    await page.screenshot({
      path: `evidence/recovered-instagram-${viewport.width}.png`,
      fullPage: true,
    });
    await page.goto(`${origin}/art-by-waambat`);
    assert.equal(await page.locator("iframe").count(), 0);
    await page
      .getByRole("button", { name: "Play Axiom GL0w Up (2021)", exact: true })
      .click();
    assert.equal(
      await page.locator("iframe").getAttribute("src"),
      "https://player.vimeo.com/video/538169390?autoplay=1",
    );
    assert.equal(
      await page
        .getByRole("link", { name: "Open original source ↗" })
        .getAttribute("href"),
      "https://player.vimeo.com/video/538169390?app_id=122963&wmode=opaque",
    );
    await page
      .getByRole("button", { name: "Next artwork", exact: true })
      .click();
    assert.equal(
      await page.locator("iframe").count(),
      0,
      "Changing artwork closes the old player",
    );
    await page
      .getByRole("button", {
        name: "Artwork 18: Pimp Comforts (2011 short film)",
        exact: true,
      })
      .click();
    assert.equal(await page.locator("iframe").count(), 0);
    assert.equal(
      await page.getByRole("button", { name: /^Play / }).count(),
      0,
      "Image-only archive entry does not invent a player",
    );
    await page
      .getByRole("button", {
        name: "Artwork 5: waambat visuals for Hans Zimmer (2017)",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name: "Play waambat visuals for Hans Zimmer (2017)",
        exact: true,
      })
      .click();
    assert.equal(
      await page.locator("iframe").getAttribute("src"),
      "https://www.youtube-nocookie.com/embed/HbP9ujYh_J4?autoplay=1",
    );
    await page
      .getByRole("button", { name: "Close player", exact: true })
      .click();
    assert.equal(await page.locator("iframe").count(), 0);
    await page.screenshot({
      path: `evidence/recovered-archive-${viewport.width}.png`,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${origin}/mechanics`);
  const active = page.locator(
    'nav[aria-label="Main navigation"] a[aria-current="page"]',
  );
  assert.equal(await active.getAttribute("href"), "/mechanics");
  assert.equal(
    await active.evaluate((e) => getComputedStyle(e).color),
    "rgb(255, 255, 255)",
  );
  const bodyStyle = await page
    .locator("html")
    .evaluate((e) => ({
      weight: getComputedStyle(e).fontWeight,
      size: getComputedStyle(e).fontSize,
      spacing: getComputedStyle(e).letterSpacing,
    }));
  assert.deepEqual(bodyStyle, {
    weight: "300",
    size: "14px",
    spacing: "0.56px",
  });
  assert.equal(
    await page.locator('script[src*="use.typekit.net"]').count(),
    0,
    "Original domain license is not extended to the preview",
  );
  const result = {
    publicPortfolio:
      "Eleven portfolio/legacy routes return 200; /nfts-copy returns canonical 308 to /",
    anonymousDraftPreview: "307 to /admin",
    unconfiguredAdmin: "503, fail closed",
    anonymousMedia: "404",
    browser:
      "Compiled production gallery: 23 original paintings, no login/database, desktop/mobile rendered without overflow; reduced motion attached no video source",
    recoveredContent:
      "Desktop/mobile: 32-image Instagram grid, eight posts, legacy routes, 4 reduced-motion-aware legacy loops, archive Vimeo/YouTube fixed destination activation/close/next and image-only entries pass. Provider HTML is a controlled fixture; actual remote playback and original geometry are not verified.",
    typography:
      "Recovered body 14px/300/.04em and active navigation colors pass; original font loader stays disabled on preview hosts.",
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
