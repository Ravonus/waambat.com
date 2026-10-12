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
const port = process.env.PREVIEW_PORT ?? "3031";
const origin = `http://localhost:${port}`;
const child = spawn(
  "node",
  ["node_modules/next/dist/bin/next", "start", "--port", port],
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
    assert.equal(await page.locator(".archive-tile").count(), 25);
    assert.equal(await page.locator("dialog[open]").count(), 0);
    await page
      .getByRole("button", { name: "View Axiom GL0w Up (2021)", exact: true })
      .click();
    assert.equal(
      await page.locator("iframe").getAttribute("src"),
      "https://player.vimeo.com/video/538169390?autoplay=1",
    );
    await page
      .getByRole("button", { name: "Next artwork", exact: true })
      .click();
    assert.equal(
      await page.locator("iframe").count(),
      1,
      "Next replaces the old player after the gallery activation",
    );
    assert.notEqual(
      await page.locator("iframe").getAttribute("src"),
      "https://player.vimeo.com/video/538169390?autoplay=1",
    );
    await page.getByRole("button", { name: "Close archive viewer" }).click();
    await page.waitForFunction(() => !document.querySelector("iframe"));
    await page
      .getByRole("button", {
        name: "View Pimp Comforts (2011 short film)",
        exact: true,
      })
      .click();
    assert.equal(
      await page.locator("iframe").count(),
      0,
      "Image-only entry has no invented player",
    );
    await page.getByRole("button", { name: "Close archive viewer" }).click();
    await page
      .getByRole("button", {
        name: "View waambat visuals for Hans Zimmer (2017)",
        exact: true,
      })
      .click();
    assert.equal(
      await page.locator("iframe").getAttribute("src"),
      "https://www.youtube-nocookie.com/embed/HbP9ujYh_J4?autoplay=1",
    );
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("dialog[open]"));
    await page.waitForFunction(() => !document.querySelector("iframe"));
    assert.equal(await page.locator("iframe").count(), 0);
    await page.screenshot({
      path: `evidence/recovered-archive-${viewport.width}.png`,
    });
  }
  await page.setViewportSize({ width: 1512, height: 733 });
  const geometry: Record<string, unknown> = {};
  const rect = async (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((e) => {
        const r = e.getBoundingClientRect();
        return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height };
      });
  await page.goto(origin);
  geometry.home = {
    hero: await rect("section[data-hero]"),
    media: await rect('[data-artwork="artwork-1"] .artwork-media'),
    title: await rect('[data-artwork="artwork-1"] h2'),
  };
  const home = geometry.home as {
    hero: { y: number; height: number };
    media: { x: number; y: number; width: number };
    title: { y: number };
  };
  // Her original painting column is unchanged: same left edge and width, same
  // distance from the painting to its caption. Only its start moved, down by
  // the hero banner that now opens the page; her own 200px gap (plus 38px of
  // page rhythm) separates the banner from the first painting. This context
  // uses reduced motion, so the scroll reveal's 18px rise is not in play.
  assert.ok(
    Math.abs(home.media.x - 276) < 0.1 &&
      Math.abs(home.media.width - 960) < 0.1,
    JSON.stringify(home),
  );
  assert.ok(
    Math.abs(home.media.y - (home.hero.y + home.hero.height + 238)) < 0.5,
    JSON.stringify(home),
  );
  assert.ok(
    Math.abs(home.title.y - home.media.y - 1001.703) < 0.2,
    JSON.stringify(home),
  );
  await page.goto(`${origin}/bio-waambat`);
  geometry.biography = {
    text: await rect(".bio-main h1"),
    side: await rect(".bio-side .artwork-media"),
  };
  const biography = geometry.biography as {
    text: { x: number; width: number };
    side: { x: number; width: number };
  };
  assert.ok(
    Math.abs(biography.text.x - 358.828) < 0.1 &&
      Math.abs(biography.text.width - 462.992) < 0.1,
  );
  assert.ok(
    Math.abs(biography.side.x - 855.828) < 0.1 &&
      Math.abs(biography.side.width - 297.328) < 0.1,
  );
  assert.equal(await page.locator(".bio-main strong").count(), 9);
  assert.equal(await page.locator(".bio-main em").count(), 3);
  await page.goto(`${origin}/mechanics`);
  geometry.mechanics = await rect(".source-centered");
  assert.ok(
    Math.abs((geometry.mechanics as { width: number }).width - 628.664) < 0.1,
  );
  await page.goto(`${origin}/contact-waambat`);
  geometry.contact = await rect(".source-contact");
  assert.ok(
    Math.abs((geometry.contact as { width: number }).width - 462.992) < 0.1,
  );
  await page.goto(`${origin}/art`);
  geometry.art = await rect(".source-two-columns > div .artwork-media");
  assert.ok(
    Math.abs((geometry.art as { width: number }).width - 462.992) < 0.1,
  );
  await page.goto(`${origin}/art-by-waambat`);
  geometry.archive = await rect(".archive-montage");
  assert.ok(
    Math.abs((geometry.archive as { width: number; y: number }).width - 1392) <
      0.1,
  );
  assert.ok(
    Math.abs((geometry.archive as { width: number; y: number }).y - 181.703) <
      0.1,
  );
  await page
    .getByRole("button", { name: "View Sus Singularity (2021)", exact: true })
    .click();
  const portrait = await rect(".archive-viewer-media");
  assert.equal(portrait.height, 600);
  assert.equal(portrait.width, 337.5);
  await page.keyboard.press("Escape");
  await writeFile(
    "evidence/source-geometry-check.json",
    JSON.stringify(
      {
        viewport: { width: 1512, height: 733 },
        geometry,
        boundary:
          "Measured widths, columns, home first artwork/title and archive start match supplied source coordinates. Fallback font glyphs, unmeasured spacers and blocked remote media are not claimed identical.",
      },
      null,
      2,
    ) + "\n",
  );
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
  const bodyStyle = await page.locator("html").evaluate((e) => ({
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
    1,
    "Original hosted embed is present without an artificial hostname gate",
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
      "Desktop/mobile: 32-image Instagram grid, eight posts, legacy routes, 4 reduced-motion-aware legacy loops, archive justified montage, fullscreen Vimeo/YouTube activation/close/next/Escape and image-only entries pass. Provider HTML is a controlled fixture; actual remote playback and original geometry are not verified.",
    typography:
      "Recovered body 14px/300/.04em and active navigation colors pass; original hosted font wiring is enabled. Cloud transport does not verify upstream font decoding or exact glyph fidelity.",
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
