import { chromium, type Locator, type Page } from "playwright";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
// Real Chromium decoding of the shipped hero renders from public/hero.
const port = 3103;
const origin = `http://localhost:${port}`;
const child = spawn(
  "node",
  ["node_modules/next/dist/bin/next", "dev", "-p", String(port)],
  {
    env: { ...process.env, WAAMBAT_PRIVATE_SITE: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
child.stdout.on("data", (d) => {
  logs += String(d);
});
child.stderr.on("data", (d) => {
  logs += String(d);
});
const evidence: Record<string, unknown> = {};
let browser;
const state = (page: Page) =>
  page.locator("[data-hero]").getAttribute("data-playback-state");
const video = (page: Page) =>
  page.locator("[data-hero] video").evaluate((v: HTMLVideoElement) => ({
    paused: v.paused,
    muted: v.muted,
    loop: v.loop,
    time: v.currentTime,
    src: v.currentSrc,
    width: v.videoWidth,
    height: v.videoHeight,
  }));
const playing = (page: Page) =>
  page.waitForFunction(
    () =>
      document
        .querySelector("[data-hero]")
        ?.getAttribute("data-playback-state") === "playing",
  );
const paused = (page: Page) =>
  page.waitForFunction(
    () =>
      document
        .querySelector("[data-hero]")
        ?.getAttribute("data-playback-state") === "paused",
  );
try {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
  });
  await mkdir("evidence/hero", { recursive: true });

  // Desktop: the banner plays muted and looping, the wordmark is live text in the brand font.
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await desktop.newPage();
  const errors: string[] = [];
  const requested: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (r) => requested.push(r.url()));
  await page.goto(origin);
  await playing(page);
  const first = await video(page);
  assert.ok(first.src.endsWith("/hero/waambat-hero-desktop.mp4"), first.src);
  assert.ok(first.muted && first.loop);
  assert.equal([first.width, first.height].join("x"), "1280x720");
  await page.waitForTimeout(900);
  assert.ok((await video(page)).time > first.time + 0.4, "video advances");
  assert.equal(
    requested.filter((u) => u.endsWith("waambat-hero-mobile.mp4")).length,
    0,
    "desktop never fetches the mobile render",
  );
  assert.equal(await page.locator("h1").count(), 1);
  const wordmark = page.locator("[data-hero] h1");
  assert.equal(((await wordmark.textContent()) ?? "").trim(), "waambat");
  assert.match(
    await wordmark.evaluate((el) => getComputedStyle(el).fontFamily),
    /amboy-inline/,
  );
  const geometry = await page.evaluate(() => {
    const frame = document
      .querySelector("[data-hero] > div")!
      .getBoundingClientRect();
    const h1 = document
      .querySelector("[data-hero] h1")!
      .getBoundingClientRect();
    return {
      frame: frame.toJSON(),
      h1: h1.toJSON(),
      overflow: document.documentElement.scrollWidth - innerWidth,
      logoShown:
        getComputedStyle(document.querySelector(".site-logo")!).display !==
        "none",
    };
  });
  assert.ok(
    Math.abs(geometry.frame.width / geometry.frame.height - 16 / 9) < 0.02,
  );
  assert.ok(
    geometry.h1.left >= geometry.frame.left &&
      geometry.h1.right <= geometry.frame.left + geometry.frame.width * 0.4,
    "wordmark stays in its column, clear of the artwork stage",
  );
  assert.equal(geometry.overflow, 0);
  assert.equal(geometry.logoShown, false, "one wordmark, not two");
  assert.ok(geometry.frame.bottom <= 900 + 1, "banner fits the first screen");
  await page.waitForTimeout(1100); // let the arrival animation settle
  await page.screenshot({ path: "evidence/hero/desktop-1440.png" });

  // The wordmark leads home: the banner's own wordmark is the link (the header
  // one is hidden here), only the link takes clicks, and it works from inner pages.
  const homeLink = page.getByRole("link", { name: "waambat home" });
  assert.equal(await homeLink.count(), 1, "one home link, not two");
  assert.equal(await homeLink.getAttribute("href"), "/");
  assert.ok(
    await homeLink.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const hit = document.elementFromPoint(
        box.x + box.width / 2,
        box.y + box.height / 2,
      );
      return !!hit && el.contains(hit);
    }),
    "the wordmark is clickable, not covered by the video",
  );
  // The wordmark stays her pink under the pointer and keyboard focus, in the banner and in the header.
  const PINK = "rgb(255, 148, 178)";
  const colorOf = (link: Locator) =>
    link.evaluate((el) => getComputedStyle(el).color);
  await homeLink.hover();
  assert.equal(await colorOf(homeLink), PINK, "banner wordmark on hover");
  await homeLink.focus();
  assert.equal(await colorOf(homeLink), PINK, "banner wordmark on focus");
  await page.mouse.move(2, 2);
  const nav = await desktop.newPage();
  await nav.goto(`${origin}/contact-waambat`, {
    waitUntil: "domcontentloaded",
  });
  const headerLogo = nav.getByRole("link", { name: "waambat home" });
  assert.equal(await colorOf(headerLogo), PINK, "header wordmark at rest");
  await headerLogo.hover();
  assert.equal(await colorOf(headerLogo), PINK, "header wordmark on hover");
  await nav.getByRole("link", { name: "waambat home" }).click();
  await nav.waitForURL(`${origin}/`);
  await nav.locator("[data-hero]").waitFor();
  await nav.getByRole("link", { name: "waambat home" }).click();
  await nav.waitForTimeout(500);
  assert.equal(new URL(nav.url()).pathname, "/", "stays home from home");
  await nav.locator("[data-hero]").waitFor();
  await nav.close();

  // Manual pause is respected through scroll away and back; offscreen pauses automatically.
  const name = (await page
    .locator("[data-hero] .media-control")
    .getAttribute("aria-label"))!;
  assert.match(name, /^Pause /);
  await page.locator("[data-hero] .media-control").click();
  await paused(page);
  await page.evaluate(() => scrollTo(0, 3000));
  await page.waitForTimeout(500);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(600);
  assert.equal(await state(page), "paused", "manual pause survives scrolling");
  assert.equal((await video(page)).paused, true);
  await page.locator("[data-hero] .media-control").click();
  await playing(page);
  await page.evaluate(() => scrollTo(0, 3000));
  await paused(page);
  assert.equal((await video(page)).paused, true, "paused while offscreen");
  await page.evaluate(() => scrollTo(0, 0));
  await playing(page);

  // Hidden tab and open mobile menu pause; returning resumes.
  await page.evaluate(
    "Object.defineProperty(document, 'hidden', { configurable: true, get() { return true; } }); document.dispatchEvent(new Event('visibilitychange'));",
  );
  await paused(page);
  await page.evaluate(
    "Object.defineProperty(document, 'hidden', { configurable: true, get() { return false; } }); document.dispatchEvent(new Event('visibilitychange'));",
  );
  await playing(page);
  assert.deepEqual(errors, []);
  evidence.desktop = {
    video: first.src,
    size: `${first.width}x${first.height}`,
    manualPause: "persists across scroll",
    offscreen: "pauses and resumes",
    hiddenTab: "pauses and resumes",
  };

  // Large and narrow-landscape viewports keep the banner whole and unclipped.
  for (const [w, h] of [
    [1920, 1080],
    [2560, 1300],
    [1024, 768],
    [844, 390],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(250);
    const box = await page.evaluate(() => {
      const f = document
        .querySelector("[data-hero] > div")!
        .getBoundingClientRect();
      return {
        w: f.width,
        h: f.height,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    assert.equal(box.overflow, 0, `${w}x${h} overflow`);
    assert.ok(box.w > 300 && box.h > 150, `${w}x${h} banner ${box.w}x${box.h}`);
    await page.waitForTimeout(1100); // let the arrival animation settle
    await page.screenshot({ path: `evidence/hero/desktop-${w}x${h}.png` });
  }

  // Phone: the portrait render, poster and composition.
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const mobile = await phone.newPage();
  const mobileRequests: string[] = [];
  const mobileErrors: string[] = [];
  mobile.on("request", (r) => mobileRequests.push(r.url()));
  mobile.on("pageerror", (e) => mobileErrors.push(e.message));
  await mobile.goto(origin);
  await playing(mobile);
  const mv = await video(mobile);
  assert.ok(mv.src.endsWith("/hero/waambat-hero-mobile.mp4"), mv.src);
  assert.equal([mv.width, mv.height].join("x"), "720x900");
  assert.equal(
    mobileRequests.filter((u) => u.endsWith("waambat-hero-desktop.mp4")).length,
    0,
    "phones never fetch the desktop render",
  );
  const poster = await mobile
    .locator("[data-hero] picture img")
    .evaluate((img: HTMLImageElement) => img.currentSrc);
  assert.ok(poster.endsWith("waambat-hero-poster-mobile.webp"), poster);
  const phoneBox = await mobile.evaluate(() => {
    const f = document
      .querySelector("[data-hero] > div")!
      .getBoundingClientRect();
    const h1 = document
      .querySelector("[data-hero] h1")!
      .getBoundingClientRect();
    const menu = document
      .querySelector('button[aria-label="Menu"]')!
      .getBoundingClientRect();
    return {
      frame: f.toJSON(),
      h1: h1.toJSON(),
      menu: menu.toJSON(),
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  assert.equal(phoneBox.overflow, 0);
  assert.ok(
    Math.abs(phoneBox.frame.width / phoneBox.frame.height - 0.8) < 0.02,
  );
  assert.ok(phoneBox.frame.top <= 1, "hero starts at the top on phones");
  assert.ok(
    phoneBox.h1.right < phoneBox.menu.left,
    "wordmark clear of the menu button",
  );
  assert.ok(
    phoneBox.menu.top >= phoneBox.frame.top &&
      phoneBox.menu.bottom <= phoneBox.frame.top + 120,
    "menu button sits in the hero's top band",
  );
  await mobile.waitForTimeout(1100); // let the arrival animation settle
  await mobile.screenshot({ path: "evidence/hero/mobile-390.png" });
  // The full-screen menu pauses the banner and releases it on close.
  await mobile.evaluate(() => scrollTo(0, 24));
  await mobile.getByRole("button", { name: "Menu", exact: true }).click();
  await mobile.locator("#mobile-site-menu[open]").waitFor();
  await paused(mobile);
  assert.equal(
    await mobile.evaluate(() => document.body.style.position),
    "fixed",
    "page scroll is locked behind the menu",
  );
  await mobile.waitForTimeout(1100); // let the arrival animation settle
  await mobile.screenshot({ path: "evidence/hero/mobile-menu-390.png" });
  const menuHome = mobile
    .locator("#mobile-site-menu")
    .getByRole("link", { name: "waambat home" });
  assert.equal(await menuHome.getAttribute("href"), "/");
  await menuHome.hover();
  assert.equal(
    await menuHome.evaluate((el) => getComputedStyle(el).color),
    "rgb(255, 148, 178)",
    "menu wordmark on hover",
  );
  await menuHome.click(); // already home: the menu closes, the page stays
  await mobile
    .locator("#mobile-site-menu[open]")
    .waitFor({ state: "detached" });
  assert.equal(new URL(mobile.url()).pathname, "/");
  await mobile.getByRole("button", { name: "Menu", exact: true }).click();
  await mobile.locator("#mobile-site-menu[open]").waitFor();
  const inner = await phone.newPage();
  await inner.goto(`${origin}/contact-waambat`, {
    waitUntil: "domcontentloaded",
  });
  await inner.getByRole("button", { name: "Menu", exact: true }).click();
  await inner.locator("#mobile-site-menu[open]").waitFor();
  await inner
    .locator("#mobile-site-menu")
    .getByRole("link", { name: "waambat home" })
    .click();
  await inner.waitForURL(`${origin}/`);
  await inner.locator("[data-hero]").waitFor();
  await inner.close();
  await mobile.getByRole("button", { name: "Close menu" }).click();
  await playing(mobile);
  assert.equal(await mobile.evaluate(() => document.body.style.position), "");
  assert.equal(await mobile.evaluate(() => scrollY), 24, "scroll restored");
  assert.deepEqual(mobileErrors, []);
  evidence.mobile = {
    video: mv.src,
    size: `${mv.width}x${mv.height}`,
    menu: "pauses banner while open, resumes on close",
  };

  // A phone on its side takes the landscape banner, whole within the screen.
  const sideways = await browser.newContext({
    viewport: { width: 667, height: 375 },
    hasTouch: true,
    isMobile: true,
  });
  const side = await sideways.newPage();
  await side.goto(origin);
  await playing(side);
  assert.ok((await video(side)).src.endsWith("waambat-hero-desktop.mp4"));
  const sideBox = await side.evaluate(() => {
    const f = document
      .querySelector("[data-hero] > div")!
      .getBoundingClientRect();
    return {
      ratio: f.width / f.height,
      bottom: f.bottom,
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  assert.ok(Math.abs(sideBox.ratio - 16 / 9) < 0.02);
  assert.ok(sideBox.bottom <= 375 + 1, "landscape banner fits the screen");
  assert.equal(sideBox.overflow, 0);
  await side.waitForTimeout(1100); // let the arrival animation settle
  await side.screenshot({ path: "evidence/hero/mobile-landscape-667.png" });
  evidence.landscapePhone = "Landscape composition, whole within 667x375";

  // Reduced motion and Save-Data: the poster is the banner until the visitor presses play.
  const calm = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const rm = await calm.newPage();
  await rm.goto(origin);
  await rm.waitForTimeout(800);
  assert.equal(await rm.locator("[data-hero] video").count(), 0);
  assert.ok(await rm.locator("[data-hero] picture img").isVisible());
  assert.equal(await state(rm), "idle");
  assert.equal(
    await rm
      .locator(".site-theme")
      .evaluate(
        (el) => getComputedStyle(el.querySelector("h1")!).animationName,
      ),
    "none",
  );
  await rm.waitForTimeout(1100); // let the arrival animation settle
  await rm.screenshot({ path: "evidence/hero/reduced-motion.png" });
  await rm.locator("[data-hero] .media-control").click();
  await playing(rm);
  assert.ok((await video(rm)).src.endsWith("waambat-hero-desktop.mp4"));
  evidence.reducedMotion =
    "Poster only until the visitor presses play; no title or reveal animation";

  // A broken video is reported honestly: the poster stays and the retry control appears.
  const broken = await desktop.newPage();
  await broken.route("**/hero/*.mp4", (route) => route.abort());
  await broken.goto(origin);
  await broken
    .getByRole("status")
    .filter({ hasText: "Video could not load" })
    .waitFor();
  assert.equal(await state(broken), "unavailable");
  assert.ok(await broken.locator("[data-hero] picture img").isVisible());
  assert.match(
    (await broken
      .locator("[data-hero] .media-control")
      .getAttribute("aria-label"))!,
    /^Retry playback/,
  );
  await broken.waitForTimeout(1100); // let the arrival animation settle
  await broken.screenshot({ path: "evidence/hero/video-unavailable.png" });
  evidence.unavailable =
    "Poster remains, an honest message and a retry control show; no placeholder hides it";

  console.log(JSON.stringify(evidence, null, 2));
} catch (error) {
  console.error(logs.slice(-3000));
  throw error;
} finally {
  await browser?.close();
  child.kill();
}
