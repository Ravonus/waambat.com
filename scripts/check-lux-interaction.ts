import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { LUX_PLAYER, PREVIEWS } from "../src/lib/ordinal-sources";
declare global {
  interface Window {
    artState: {
      identity: string;
      drags: number;
      zooms: number;
      clicks: number;
    };
  }
}
const origin = "http://localhost:3052";
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--port", "3052"],
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
let browser;
const results: unknown[] = [];
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1512, height: 733 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    let loads = 0;
    await context.route("**/*", (r) =>
      r.request().url().startsWith(origin) ? r.continue() : r.abort(),
    );
    await context.route(LUX_PLAYER, (r) => {
      loads++;
      return r.fulfill({
        contentType: "text/html",
        body: `<html><style>html,body{margin:0;width:100%;height:100%;background:#ff9a9a;touch-action:none}canvas{width:100%;height:100%}</style><canvas width="300" height="300" tabindex="0"></canvas><script>window.artState={identity:crypto.randomUUID(),drags:0,zooms:0,clicks:0};const c=document.querySelector('canvas'),p=c.getContext('2d');p.fillStyle='#ff9a9a';p.fillRect(0,0,300,300);c.addEventListener('pointermove',e=>{if(e.buttons){artState.drags++;p.fillStyle='#9457ff';p.fillRect(0,0,150,150)}});c.addEventListener('click',()=>artState.clicks++);c.addEventListener('wheel',e=>{e.preventDefault();artState.zooms++},{passive:false});</script></html>`,
      });
    });
    const page = await context.newPage();
    await page.goto(origin + "/ordinals");
    const lux = page.locator('[data-ordinal-player="lux-ok-algo"]');
    // The controls sit beneath the artwork, in the card around it.
    const card = page.locator('[data-artwork="lux-ok-algo"]');
    await lux.scrollIntoViewIfNeeded();
    // The cached loop is what loads first; the live inscription is only requested on "Interact live".
    assert.equal(await lux.locator("iframe").count(), 0);
    assert.equal(loads, 0, "LUX is not fetched until it is asked for");
    assert.equal(
      await lux.locator("video").getAttribute("src"),
      PREVIEWS.lux.loop,
    );
    const open = card.getByRole("button", {
      name: "Interact live with LUX · OK ALGO",
    });
    if (mobile) await open.tap();
    else await open.click();
    await lux.locator("iframe").waitFor();
    // The loop stays up until the piece has drawn something; then the live piece is shown.
    await page.waitForSelector(
      '[data-ordinal-player="lux-ok-algo"][data-live="shown"]',
      { timeout: 20000 },
    );
    // Opening starts interaction; step back to the passive state the rest of this check starts from.
    await card
      .getByRole("button", { name: "Exit interaction", exact: true })
      .click();
    const painted = () =>
      page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
    await painted();
    const handle = await lux.locator("iframe").elementHandle();
    const frame = page.frameLocator('iframe[title="LUX · OK ALGO"]');
    const identity = await frame
      .locator("canvas")
      .evaluate(
        () =>
          (window as Window & { artState: { identity: string } }).artState
            .identity,
      );
    const stable = async () => {
      assert.equal(await handle!.evaluate((el) => el.isConnected), true);
      assert.equal(
        await handle!.evaluate(
          (el) =>
            el ===
            document.querySelector(
              '[data-ordinal-player="lux-ok-algo"] iframe',
            ),
        ),
        true,
      );
      assert.equal(await lux.locator("iframe").getAttribute("src"), LUX_PLAYER);
      assert.equal(
        await frame
          .locator("canvas")
          .evaluate(
            () =>
              (window as Window & { artState: { identity: string } }).artState
                .identity,
          ),
        identity,
      );
      assert.equal(loads, 1);
    };
    const inactive = async () => {
      assert.equal(
        await lux
          .locator("iframe")
          .evaluate((el) => getComputedStyle(el).pointerEvents),
        "none",
      );
      assert.equal(await lux.locator("iframe").getAttribute("tabindex"), "-1");
      await stable();
      await painted();
    };
    await inactive();
    const bounds = await lux.boundingBox();
    assert.ok(bounds);
    const before = await page.evaluate(() => scrollY);
    const x = bounds.x + bounds.width * 0.5,
      y = bounds.y + bounds.height * 0.5;
    if (mobile) {
      const session = await context.newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y }],
      });
      for (let i = 1; i <= 10; i++) {
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x, y: y - i * 18 }],
        });
        await page.waitForTimeout(25);
      }
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await session.detach();
    } else {
      await page.mouse.move(x, y);
      await page.mouse.wheel(0, 180);
    }
    await page.waitForFunction((before) => scrollY > before + 30, before);
    assert.equal(
      await frame
        .locator("canvas")
        .evaluate(
          () =>
            (window as Window & { artState: { zooms: number } }).artState.zooms,
        ),
      0,
    );
    await stable();
    await lux.scrollIntoViewIfNeeded();
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() =>
        scrollTo(0, document.documentElement.scrollHeight),
      );
      await page.waitForTimeout(100);
      await stable();
      await lux.scrollIntoViewIfNeeded();
      await inactive();
      const activate = card.getByRole("button", {
        name: "Interact",
        exact: true,
      });
      if (mobile) await activate.tap();
      else await activate.click();
      assert.equal(
        await lux
          .locator("iframe")
          .evaluate((el) => getComputedStyle(el).pointerEvents),
        "auto",
      );
      const b = await lux.boundingBox();
      assert.ok(b);
      await page.mouse.move(b.x + b.width * 0.4, b.y + b.height * 0.4);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width * 0.55, b.y + b.height * 0.5, {
        steps: 8,
      });
      await page.mouse.up();
      assert.equal(
        await lux.getAttribute("data-interacting"),
        "true",
        "Focus into the frame must not close interaction",
      );
      const activeScroll = await page.evaluate(() => scrollY);
      await page.mouse.wheel(0, 80);
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => scrollY), activeScroll);
      await card
        .getByRole("button", { name: "Exit interaction", exact: true })
        .click();
      await inactive();
      await page.setViewportSize(
        mobile
          ? { width: 400 + i * 5, height: 780 + i * 10 }
          : { width: 1250 + i * 20, height: 700 + i * 10 },
      );
      await lux.scrollIntoViewIfNeeded();
      await stable();
      assert.deepEqual(
        await frame
          .locator("canvas")
          .evaluate((el) =>
            Array.from(
              (el as HTMLCanvasElement)
                .getContext("2d")!
                .getImageData(2, 2, 1, 1).data,
            ),
          ),
        [148, 87, 255, 255],
        "Rendered interaction state survives exit/reentry and resizing",
      );
    }
    const finalState = await frame
      .locator("canvas")
      .evaluate(
        () =>
          (window as Window & { artState: { drags: number; zooms: number } })
            .artState,
      );
    assert.ok(finalState.drags >= 3);
    assert.ok(finalState.zooms >= 3);
    const activate = card.getByRole("button", {
      name: "Interact",
      exact: true,
    });
    await activate.focus();
    await page.keyboard.press("Enter");
    assert.equal(await lux.getAttribute("data-interacting"), "true");
    await page.keyboard.press("Escape");
    await inactive();
    assert.equal(
      await activate.evaluate((el) => el === document.activeElement),
      true,
    );
    await page.evaluate(() =>
      window.dispatchEvent(new Event("waambat:navigate")),
    );
    await stable();
    results.push({
      mobile,
      loads,
      identity,
      cachedLoopFirst: true,
      viewportCycles: 3,
      interactionCycles: 3,
      passiveWheelOrTouchScroll: true,
      activeDragAndZoom: finalState,
      keyboardEnterAndParentEscape: true,
      source: LUX_PLAYER,
      retainedRenderedCanvasState: true,
    });
    await context.close();
  }
  assert.equal(server.exitCode, null);
  await writeFile(
    "/tmp/waambat-cursor-evidence/lux-state-check.json",
    JSON.stringify(
      {
        scope:
          "Compiled cloud app; controlled cross-origin interactive canvas, not a substitute for real LUX artwork. Actual iframe identity/src and provider-document requests tracked.",
        results,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser?.close();
  server.kill();
}
