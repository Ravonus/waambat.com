import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright";
import { createHash } from "node:crypto";
const origin = "http://localhost:3043";
const directory = await mkdtemp(join(tmpdir(), "waambat-presentation-"));
const preview =
  "https://ordinals.com/preview/383773bbfe98f8fecef04f65c3bbf56fbdc044cb3cdeaf2eb546d140adac5162i98";
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
    executablePath: "/usr/bin/chromium",
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
      frameRequests = 0;
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
    await context.route(preview, (route) => {
      frameRequests++;
      return route.fulfill({
        contentType: "text/html",
        body: '<html><style>html,body{margin:0;background:black;height:100%}video{width:100%;height:100%;object-fit:contain}</style><body><video src="http://localhost:3043/fixture-motion.mp4" autoplay muted loop playsinline></video></body></html>',
      });
    });
    await page.goto(origin + "/ordinals");
    const player = page.locator(
      '[data-ordinal-player="kismet-twist-collection"]',
    );
    await player.scrollIntoViewIfNeeded();
    await player.locator("iframe").waitFor();
    const video = page
      .frameLocator('iframe[title="Kismet Twist"]')
      .locator("video");
    await video.evaluate((node: HTMLVideoElement) => node.play());
    await page.waitForTimeout(250);
    const t0 = await video.evaluate(
      (node: HTMLVideoElement) => node.currentTime,
    );
    await page.waitForTimeout(350);
    const t1 = await video.evaluate(
      (node: HTMLVideoElement) => node.currentTime,
    );
    assert.ok(t1 > t0);
    const frame = await player.boundingBox();
    assert.ok(frame);
    assert.equal(Math.round(frame.width), viewport.width === 1512 ? 640 : 350);
    assert.ok(Math.abs(frame.width - frame.height) < 1);
    await page.screenshot({
      path: `evidence/ordinal-presentation-${viewport.width}.png`,
    });
    await player
      .getByRole("button", { name: "Pause Kismet Twist", exact: true })
      .click();
    assert.equal(await player.locator("iframe").count(), 0);
    await page.evaluate(() => scrollTo(0, 0));
    await player.scrollIntoViewIfNeeded();
    assert.equal(
      await player.locator("iframe").count(),
      0,
      "Manual pause survives reentry",
    );
    await player
      .getByRole("button", { name: "Play Kismet Twist", exact: true })
      .click();
    await player.locator("iframe").waitFor();
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction(
      () => !document.querySelector("[data-ordinal-player] iframe"),
    );
    assert.ok(
      (await page
        .getByRole("link", {
          name: /^View Kismet Twist on Satflow/,
        })
        .getAttribute("href")) ===
        "https://www.satflow.com/ordinals/kismettwist",
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await player.scrollIntoViewIfNeeded();
    assert.equal(await player.locator("iframe").count(), 0);
    await player
      .getByRole("button", { name: "Play Kismet Twist", exact: true })
      .click();
    await player.locator("iframe").waitFor();
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
      decodedFixtureTime0: t0,
      decodedFixtureTime1: t1,
      iframeRequests: frameRequests,
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
          "Generous640px desktop / full-width350px mobile frame, uncropped, direct Satflow/Pink Paper links; original legacy Ordinals preserved",
        lifecycle:
          "Automatic in-view inscription frame, reliable pause via frame removal on offscreen/manual pause; manual pause persists, reduced motion needs explicitPlay. Cross-origin inscriptions have no verified pause protocol, so reentry reinitializes the frame.",
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
