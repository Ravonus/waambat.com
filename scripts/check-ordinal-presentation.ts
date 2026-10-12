import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { PREVIEWS } from "../src/lib/ordinal-sources";
const origin = "http://localhost:3043";
const directory = await mkdtemp(join(tmpdir(), "waambat-presentation-"));
const preview =
  "https://ordinals.com/content/60533f24d8b77bcc049f27d9853d185591ea4b81ffe51076cfd985f6f542ef9ai0";
const lux =
  "https://ordinals.com/content/ce994e920942542babe215b0837704be9c73e9d08cdb8e6a818cf7767dbc7dcci2";
const gamma =
  "https://ordinals.com/content/2d284790a8ecddb0f4aa21e7763e0e499fdb068e79f398ad268dda7fcb3eabfei0";
const image =
  "https://images.squarespace-cdn.com/content/v1/5e17c59b7605d5016da6d51c/153558c0-d955-4f3c-ad18-5e491d9fd70a/MECHANICS_v002.png";
let server: ReturnType<typeof spawn> | undefined;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
const results: Record<string, unknown>[] = [];
try {
  execFileSync("ffmpeg", [
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=64x64:rate=8:duration=2",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    join(directory, "motion.mp4"),
  ]);
  execFileSync("ffmpeg", [
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "testsrc=size=64x64:rate=4:duration=2",
    "-plays",
    "0",
    "-f",
    "apng",
    join(directory, "animation.png"),
  ]);
  const motion = await readFile(join(directory, "motion.mp4"));
  const animation = await readFile(join(directory, "animation.png"));
  assert.ok(animation.includes(Buffer.from("acTL")));
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", "3043"],
    {
      env: {
        ...process.env,
        CMS_CONTENT_PROVIDER: "",
        AUTH_SECRET: "",
        WAAMBAT_PRIVATE_SITE: "0",
      },
      stdio: "ignore",
    },
  );
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(origin + "/admin")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.ok(ready);
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  for (const viewport of [
    { width: 1512, height: 733 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    let fontRequests = 0,
      amboyRequests = 0,
      inscriptionRequests = 0;
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === origin) return route.continue();
      return route.abort();
    });
    await context.route("https://use.typekit.net/**", (route) => {
      fontRequests++;
      if (
        route.request().url() ===
        "https://use.typekit.net/af/f4c430/00000000000000007735b4f5/31/l?subset_id=2&fvd=n4&v=3"
      )
        amboyRequests++;
      return route.abort();
    });
    await context.route("https://i.imgur.com/**", (route) =>
      route.fulfill({ contentType: "video/mp4", body: motion }),
    );
    await context.route(image, (route) =>
      route.fulfill({ contentType: "image/png", body: animation }),
    );
    await context.route(
      "https://whitepaper.terminus.art/images/lux3.webp",
      (route) => route.fulfill({ contentType: "image/png", body: animation }),
    );
    await context.route(origin + "/fixture-motion.mp4", (route) =>
      route.fulfill({ contentType: "video/mp4", body: motion }),
    );
    await context.route(gamma, (route) => {
      inscriptionRequests++;
      return route.fulfill({
        contentType: "text/html",
        body: "<html><body>gamma</body></html>",
      });
    });
    await context.route(preview, (route) => {
      inscriptionRequests++;
      return route.fulfill({
        contentType: "text/html",
        body: '<html><style>html,body{margin:0;background:black;height:100%}video{width:100%;height:100%;object-fit:contain}</style><body><video src="http://localhost:3043/fixture-motion.mp4" autoplay muted loop playsinline></video></body></html>',
      });
    });
    await context.route(lux, (route) => {
      inscriptionRequests++;
      return route.fulfill({
        contentType: "text/html",
        body: '<html><style>html,body{margin:0;background:black;height:100%}video{width:100%;height:100%;object-fit:contain}</style><body><video src="http://localhost:3043/fixture-motion.mp4" autoplay muted loop playsinline></video></body></html>',
      });
    });
    await page.goto(origin + "/ordinals");
    const ids = [
      ["lux-ok-algo", PREVIEWS.lux],
      ["kismet-twist-collection", PREVIEWS.kismet],
      ["gamma-user-artwork", PREVIEWS.gamma],
    ] as const;
    const stage = (id: string) => page.locator(`[data-ordinal-player="${id}"]`);
    const card = (id: string) => page.locator(`[data-artwork="${id}"]`);
    const playing = (id: string) =>
      page.waitForFunction(
        (id) => {
          const v = document.querySelector<HTMLVideoElement>(
            `[data-ordinal-player="${id}"] video`,
          );
          return !!v && !v.paused && v.currentTime > 0.2;
        },
        id,
        { timeout: 20000 },
      );
    const paused = (id: string) =>
      page.waitForFunction(
        (id) =>
          document.querySelector<HTMLVideoElement>(
            `[data-ordinal-player="${id}"] video`,
          )?.paused === true,
        id,
      );
    // All three pieces are on screen as cached same-origin loops, playing, before any inscription is asked for.
    for (const [id, previews] of ids) {
      await stage(id).scrollIntoViewIfNeeded();
      const loop = stage(id).locator("video");
      assert.equal(await loop.getAttribute("src"), previews.loop);
      assert.equal(await loop.getAttribute("poster"), previews.poster);
      assert.equal(await stage(id).locator("iframe").count(), 0, id);
      await playing(id);
    }
    assert.equal(
      inscriptionRequests,
      0,
      "No inscription is fetched from ordinals.com until a visitor opens one",
    );
    // Only LUX is interactive; the other two are videos, so they offer their loop and their inscription page.
    assert.equal(
      await page.getByRole("button", { name: /^Interact live/ }).count(),
      1,
    );
    for (const [id, inscription] of [
      [
        "kismet-twist-collection",
        "https://ordinals.com/inscription/60533f24d8b77bcc049f27d9853d185591ea4b81ffe51076cfd985f6f542ef9ai0",
      ],
      [
        "gamma-user-artwork",
        "https://ordinals.com/inscription/2d284790a8ecddb0f4aa21e7763e0e499fdb068e79f398ad268dda7fcb3eabfei0",
      ],
    ] as const)
      assert.equal(
        await card(id)
          .getByRole("link", { name: /^Original inscription/ })
          .getAttribute("href"),
        inscription,
      );
    // The three pieces sit in one row on a desktop and in one square column on a phone, uncropped.
    await page.evaluate(() => scrollTo(0, 0));
    const boxes: { x: number; y: number; width: number; height: number }[] = [];
    for (const [id] of ids) {
      const box = await stage(id).boundingBox();
      assert.ok(box, id);
      assert.ok(Math.abs(box.width - box.height) < 1, `${id} is square`);
      boxes.push(box);
    }
    assert.ok(boxes.every((b) => Math.abs(b.width - boxes[0]!.width) < 1));
    if (viewport.width === 1512) {
      assert.ok(
        boxes.every((b) => Math.abs(b.y - boxes[0]!.y) < 1),
        "one row",
      );
      assert.ok(boxes[0]!.x < boxes[1]!.x && boxes[1]!.x < boxes[2]!.x);
      assert.ok(
        boxes.every((b) => b.y + b.height <= viewport.height),
        "All three pieces are visible without scrolling",
      );
    } else {
      assert.ok(
        boxes.every((b) => b.x >= 0 && b.x + b.width <= viewport.width),
      );
      assert.ok(boxes[1]!.y > boxes[0]!.y + boxes[0]!.height);
      assert.ok(boxes[0]!.width >= 300);
    }
    const luxBounds = boxes[0]!;
    const frame = boxes[1]!;
    // Off-screen loops pause themselves, so bring one back and check that it resumes by itself.
    await stage("kismet-twist-collection").scrollIntoViewIfNeeded();
    await playing("kismet-twist-collection");
    // The loops can be paused and resumed.
    await card("kismet-twist-collection")
      .getByRole("button", { name: "Pause Kismet Twist preview" })
      .click();
    await paused("kismet-twist-collection");
    await card("kismet-twist-collection")
      .getByRole("button", { name: "Play Kismet Twist preview" })
      .click();
    await playing("kismet-twist-collection");
    const luxPlayer = stage("lux-ok-algo");
    await luxPlayer.scrollIntoViewIfNeeded();
    await card("lux-ok-algo")
      .getByRole("button", { name: "Interact live with LUX · OK ALGO" })
      .click();
    await luxPlayer.locator("iframe").waitFor();
    assert.equal(await luxPlayer.locator("iframe").getAttribute("src"), lux);
    // The loop stays up until the piece has drawn something, then the live piece takes over.
    await page.waitForSelector(
      '[data-ordinal-player="lux-ok-algo"][data-live="shown"]',
      { timeout: 20000 },
    );
    assert.equal(inscriptionRequests, 1, "Only the opened piece is requested");
    if (viewport.width === 390) {
      await page
        .getByRole("button", { name: "Menu", exact: true })
        .evaluate((button) => (button as HTMLButtonElement).click());
      await page.getByRole("dialog", { name: "Main navigation" }).waitFor();
      await luxPlayer.locator("iframe").evaluate((node) => {
        (node as HTMLIFrameElement & { kept?: boolean }).kept = true;
      });
      await page.getByRole("button", { name: "Close menu" }).click();
      await luxPlayer.locator("iframe").waitFor();
      assert.equal(
        await luxPlayer
          .locator("iframe")
          .evaluate(
            (node) => (node as HTMLIFrameElement & { kept?: boolean }).kept,
          ),
        true,
        "Fullscreen navigation keeps the opened inscription document",
      );
    }
    await page.screenshot({
      path: `evidence/ordinal-presentation-${viewport.width}.png`,
    });
    // An opened inscription has no pause protocol, so it offers no Pause; leaving and re-entering the
    // viewport keeps the same document.
    assert.equal(
      await luxPlayer.getByRole("button", { name: /^Pause/ }).count(),
      0,
    );
    await luxPlayer.locator("iframe").evaluate((node) => {
      (node as HTMLIFrameElement & { kept?: boolean }).kept = true;
    });
    await page.evaluate(() =>
      scrollTo(0, document.documentElement.scrollHeight),
    );
    await page.waitForTimeout(300);
    await luxPlayer.scrollIntoViewIfNeeded();
    assert.equal(await luxPlayer.locator("iframe").count(), 1);
    assert.equal(
      await luxPlayer
        .locator("iframe")
        .evaluate(
          (node) => (node as HTMLIFrameElement & { kept?: boolean }).kept,
        ),
      true,
      "Scrolling away and back does not reload the opened inscription",
    );
    // The visitor can go back to the cached loop.
    await card("lux-ok-algo")
      .getByRole("button", { name: "Back to preview", exact: true })
      .click();
    assert.equal(await luxPlayer.locator("iframe").count(), 0);
    await playing("lux-ok-algo");
    assert.equal(
      await card("kismet-twist-collection")
        .getByRole("link", { name: /^View on Satflow/ })
        .getAttribute("href"),
      "https://www.satflow.com/ordinals/kismettwist",
    );
    assert.equal(
      await card("gamma-user-artwork")
        .getByRole("link", { name: /^View on Gamma/ })
        .getAttribute("href"),
      "https://gamma.io/ordinals/inscriptions/2d284790a8ecddb0f4aa21e7763e0e499fdb068e79f398ad268dda7fcb3eabfei0",
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    // With reduced motion the loops wait for an explicit Play, and no inscription is opened by itself.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await stage("kismet-twist-collection").scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await paused("kismet-twist-collection");
    assert.equal(
      await stage("kismet-twist-collection").locator("iframe").count(),
      0,
    );
    await card("kismet-twist-collection")
      .getByRole("button", { name: "Play Kismet Twist preview", exact: true })
      .click();
    await playing("kismet-twist-collection");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(origin + "/mechanics");
    const sourceImage = page.locator(`img[src="${image}"]`);
    await sourceImage.scrollIntoViewIfNeeded();
    await sourceImage.evaluate((node: HTMLImageElement) => node.decode());
    assert.equal(await sourceImage.getAttribute("srcset"), null);
    const first = await sourceImage.screenshot();
    await page.waitForTimeout(550);
    const second = await sourceImage.screenshot();
    assert.notEqual(
      createHash("sha256").update(first).digest("hex"),
      createHash("sha256").update(second).digest("hex"),
    );
    await writeFile(
      `evidence/animation-fixture-${viewport.width}-0.png`,
      first,
    );
    await writeFile(
      `evidence/animation-fixture-${viewport.width}-1.png`,
      second,
    );
    assert.ok(
      fontRequests > 0,
      "The original hosted embed is requested without an extra enable flag",
    );
    assert.ok(
      amboyRequests > 0,
      "The exact original Amboy hosted font resource is requested",
    );
    results.push({
      viewport,
      frame,
      luxFrame: luxBounds,
      verifiedPlayerURLsWired: true,
      inscriptionRequests,
      originalHostedFontRequested: true,
      exactOriginalAmboyResourceRequested: true,
      animatedPngExactSourceAndSpacedFrames: true,
      overflow: false,
    });
    await context.close();
  }
  await writeFile(
    "evidence/ordinal-presentation-check.json",
    JSON.stringify(
      {
        boundary:
          "Compiled application in real Chromium; generated MP4/APNG and controlled on-chain iframe transport. Actual upstream fonts, Kismet/LUX and mechanics media remain separate live acceptance.",
        collectionPresentation:
          "LUX, Kismet Twist and Edge Corporeal side by side on a desktop (one square column on a phone), uncropped, each a cached same-origin loop playing at once; direct Satflow/Gamma/Pink Paper links; the early GIF inscriptions kept",
        lifecycle:
          "Loops play from cached files with a pause control and no request to ordinals.com; only LUX is interactive, opened on request and kept attached (never reloaded) when it leaves the viewport or the menu opens, and the visitor can return to the loop; reduced motion needs an explicit Play",
        font: "Original Squarespace/Typekit embed requested; blocked cloud response is not proof of actual Amboy font loading",
        trailer:
          "Existing editable archived empty slot remains; no rejectedcut or Kismetloop substituted",
        results,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Ordinal presentation, iframe lifecycle, font wiring and native animated-PNG fixture checks pass",
  );
} finally {
  await browser?.close();
  server?.kill();
  await rm(directory, { recursive: true, force: true });
}
