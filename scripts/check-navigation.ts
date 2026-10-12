import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

// Isolated public seed content; no hosted requests, accounts or content writes.
const origin = process.env.NAV_CHECK_ORIGIN ?? "http://localhost:3042";
const child = process.env.NAV_CHECK_ORIGIN
  ? undefined
  : spawn(
      "node",
      ["node_modules/next/dist/bin/next", "start", "--port", "3042"],
      {
        env: {
          ...process.env,
          CMS_CONTENT_PROVIDER: "",
          CMS_LOCAL_TEST: "",
          WAAMBAT_PRIVATE_SITE: "0",
        },
        stdio: "ignore",
      },
    );
const evidence: Record<string, unknown> = {};
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${origin}/contact-waambat`)).ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await context.route("**/*", async (route) => {
    if (!route.request().url().startsWith(origin)) await route.abort();
    else await route.continue();
  });
  const page = await context.newPage();
  await page.goto(`${origin}/contact-waambat`);
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  await page.waitForFunction(() =>
    Object.keys(document.querySelector("header button") ?? {}).some((key) =>
      key.startsWith("__reactFiber$"),
    ),
  );
  const dialog = page.getByRole("dialog", { name: "Main navigation" });
  const close = page.getByRole("button", { name: "Close menu" });
  const lock = () => page.evaluate(() => document.body.style.position);
  await menu.click();
  await dialog.waitFor();
  assert.equal(await lock(), "fixed");
  assert.equal(
    await close.evaluate((el) => el === document.activeElement),
    true,
  );
  const bounds = await dialog.boundingBox();
  assert.deepEqual(bounds, { x: 0, y: 0, width: 390, height: 844 });
  assert.equal(
    await dialog.evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  await page.keyboard.press("Shift+Tab");
  assert.equal(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
    true,
  );
  await page.keyboard.press("Tab");
  assert.equal(
    await close.evaluate((el) => el === document.activeElement),
    true,
  );
  await page.keyboard.press("Escape");
  assert.equal(await dialog.count(), 0);
  assert.equal(await lock(), "");
  assert.equal(
    await menu.evaluate((el) => el === document.activeElement),
    true,
  );
  evidence.modal =
    "390×844 fullscreen; close initially focused; native modal traps Tab/Shift+Tab and blocks background; Escape restores trigger; reduced motion has no animation";

  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.scrollTo(0, 420));
    const before = await page.evaluate(() => window.scrollY);
    // Preserve the scrolled underlying page while opening a header offscreen.
    await menu.evaluate((el) => (el as HTMLButtonElement).click());
    await dialog.waitFor();
    await page.mouse.wheel(0, 220);
    assert.equal(await lock(), "fixed");
    await close.click();
    await page.waitForFunction(() => document.body.style.position === "");
    assert.equal(await page.evaluate(() => window.scrollY), before);
  }
  evidence.repeatedDismissal =
    "Four open/close cycles preserve prior scroll; wheel cannot scroll underlying fixed body; body styles fully restored";

  await menu.evaluate((el) => (el as HTMLButtonElement).click());
  await dialog.waitFor();
  await page.setViewportSize({ width: 1512, height: 733 });
  await page.waitForFunction(() => document.body.style.position === "");
  assert.equal(await dialog.count(), 0);
  const desktop = page.getByRole("navigation", {
    name: "Main navigation",
    exact: true,
  });
  assert.equal(await desktop.isVisible(), true);
  const home = desktop.getByRole("link", { name: "NFTs", exact: true });
  await home.focus();
  assert.notEqual(
    await home.evaluate((el) => getComputedStyle(el).outlineStyle),
    "none",
  );
  await home.hover();
  await page.waitForTimeout(180);
  assert.equal(
    await home.evaluate((el) => getComputedStyle(el, "::after").opacity),
    "0.8",
  );
  await page.mouse.down();
  assert.notEqual(
    await home.evaluate((el) => getComputedStyle(el).transform),
    "none",
  );
  await page.mouse.move(1450, 650);
  await page.mouse.up();
  assert.equal(
    await desktop
      .locator('[aria-current="page"]')
      .evaluate((el) => getComputedStyle(el, "::after").opacity),
    "0.8",
  );
  evidence.desktop =
    "Original header geometry retained; active underline, hover underline, press translation and visible keyboard focus checked; resizing closes overlay and releases body lock";

  await page.setViewportSize({ width: 390, height: 844 });
  await menu.click();
  await dialog.getByRole("link", { name: "bio", exact: true }).click();
  await page.waitForURL(`${origin}/bio-waambat`);
  await page.waitForFunction(() => document.body.style.position === "");
  assert.equal(await dialog.count(), 0);
  await page.goBack();
  await page.waitForURL(`${origin}/contact-waambat`);
  assert.equal(await dialog.count(), 0);
  await page.goForward();
  await page.waitForURL(`${origin}/bio-waambat`);
  assert.equal(await dialog.count(), 0);
  assert.equal(await lock(), "");
  await menu.click();
  await page.goBack();
  await page.waitForURL(`${origin}/contact-waambat`);
  await page.waitForFunction(() => document.body.style.position === "");
  assert.equal(await dialog.count(), 0);
  await page.goForward();
  await page.waitForURL(`${origin}/bio-waambat`);
  await menu.click();
  const blockedLink = dialog.getByRole("link", {
    name: "quantum mechanics",
    exact: true,
  });
  await blockedLink.evaluate((el) =>
    el.addEventListener("click", (event) => event.preventDefault(), {
      capture: true,
      once: true,
    }),
  );
  await blockedLink.click();
  assert.equal(await dialog.isVisible(), true);
  assert.equal(await lock(), "fixed");
  assert.ok(page.url().endsWith("/bio-waambat"));
  await page.keyboard.press("Escape");
  assert.equal(await lock(), "");
  evidence.cancelled =
    "A prevented selection leaves the dialog available; browser Back while open commits the route and unlocks without reopening on Forward";
  evidence.navigation =
    "Successful selection closes only after route commit; Back/Forward do not reopen prior menu or retain body lock";

  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const delayed = /\/mechanics(?:\?|$)/;
  await context.route(delayed, async (route) => {
    await held;
    await route.continue();
  });
  await menu.click();
  await dialog
    .getByRole("link", { name: "quantum mechanics", exact: true })
    .click();
  await page.waitForTimeout(350);
  assert.equal(await dialog.isVisible(), true);
  assert.equal(await lock(), "fixed");
  await close.click();
  assert.equal(await lock(), "");
  release();
  await page.waitForURL(`${origin}/mechanics`);
  assert.equal(await dialog.count(), 0);
  assert.equal(await lock(), "");
  evidence.interrupted =
    "Delayed navigation keeps menu usable and locked; explicit dismissal during pending request restores scroll; later successful route stays unlocked";
  await context.unroute(delayed);

  await menu.click();
  await dialog
    .getByRole("link", { name: "quantum mechanics", exact: true })
    .click();
  await page.waitForFunction(() => document.body.style.position === "");
  assert.equal(await dialog.count(), 0);
  evidence.samePage =
    "Selecting the current route dismisses without requiring a pathname change";
  await menu.click();
  await page.goto(`${origin}/waambat`);
  assert.equal(await lock(), "");
  assert.equal(await dialog.count(), 0);
  evidence.unmount =
    "Navigation to header-free legacy splash releases modal/body lock";
  await page.goto(`${origin}/contact-waambat`);
  await page.setViewportSize({ width: 390, height: 450 });
  await menu.click();
  await dialog.hover();
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(100);
  assert.ok(await dialog.evaluate((el) => el.scrollTop > 0));
  assert.equal(await close.isVisible(), true);
  const closeBounds = await close.boundingBox();
  assert.ok(
    closeBounds &&
      closeBounds.y >= 0 &&
      closeBounds.y + closeBounds.height < 450,
  );
  await close.click();
  assert.equal(await lock(), "");
  evidence.shortViewport =
    "390×450 menu scrolls independently while close control stays visible; dismissal unlocks body";
  await page.setViewportSize({ width: 390, height: 844 });
  await menu.click();
  await page.screenshot({ path: "evidence/navigation-mobile.png" });
  await close.click();
  await page.setViewportSize({ width: 1512, height: 733 });
  await page.screenshot({ path: "evidence/navigation-desktop.png" });
  await writeFile(
    "evidence/navigation-check.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        mode: "Local real browser, synthetic network delay, remote media blocked",
        ...evidence,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser?.close();
  child?.kill("SIGTERM");
}
