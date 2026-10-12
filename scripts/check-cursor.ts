import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, type Page } from "playwright";

// Public seed + browser-only controls. Never touches hosted content/auth/settings.
const origin = process.env.CURSOR_CHECK_ORIGIN ?? "http://localhost:3045";
const output =
  process.env.CURSOR_CHECK_OUTPUT ?? "/tmp/waambat-cursor-evidence";
await mkdir(output, { recursive: true });
const child = process.env.CURSOR_CHECK_ORIGIN
  ? undefined
  : spawn(
      "node",
      ["node_modules/next/dist/bin/next", "start", "--port", "3045"],
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
const evidence: Record<string, unknown> = {
  origin,
  viewport: "1512×677",
  network:
    "Loopback app only; foreign frame uses controlled HTML; upstream artwork transport is not claimed.",
};
let browser;
const sample = (page: Page) =>
  page.evaluate(() => {
    const c = document.querySelector<HTMLElement>("[data-pink-cursor]")!;
    const ink = c.firstElementChild!;
    const matrix = new DOMMatrix(c.style.transform);
    const target = document.elementFromPoint(matrix.m41, matrix.m42);
    return {
      state: c.dataset.cursorState,
      opacity: c.style.opacity,
      open: c.matches(":popover-open"),
      count: document.querySelectorAll("[data-pink-cursor]").length,
      suppressed: document.documentElement.hasAttribute("data-waambat-cursor"),
      target: target?.tagName,
      computed: target && getComputedStyle(target).cursor,
      pointerEvents: getComputedStyle(c).pointerEvents,
      mask: getComputedStyle(ink).maskImage,
    };
  });
const state = async (page: Page, expected: string) => {
  await page.waitForFunction((expected) => {
    const c = document.querySelector<HTMLElement>("[data-pink-cursor]");
    return (
      c?.dataset.cursorState === expected &&
      c.style.opacity === "1" &&
      c.matches(":popover-open")
    );
  }, expected);
  const actual = await sample(page);
  assert.equal(actual.count, 1);
  assert.equal(actual.suppressed, true);
  assert.equal(actual.computed, "none");
  assert.equal(actual.pointerEvents, "none");
  assert.ok(actual.mask.startsWith('url("data:image/svg+xml,'));
  return actual;
};
const native = async (page: Page) => {
  await page.waitForFunction(
    () => !document.documentElement.hasAttribute("data-waambat-cursor"),
  );
  const actual = await sample(page);
  assert.equal(actual.opacity, "0");
  assert.equal(actual.open, false);
  return actual;
};
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${origin}/mechanics`)).ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  assert.equal(
    child?.exitCode ?? null,
    null,
    "Local test server must start successfully",
  );
  const context = await browser.newContext({
    viewport: { width: 1512, height: 677 },
  });
  await context.route("**/*", (route) => {
    if (route.request().url() === "http://127.0.0.1:3045/cursor-frame")
      return route.fulfill({
        contentType: "text/html",
        body: '<button style="width:100%;height:100%">Foreign frame interaction</button>',
      });
    return route.request().url().startsWith(origin)
      ? route.continue()
      : route.abort();
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}/mechanics`);
  await page.locator("[data-cursor-ready]").waitFor({ state: "attached" });
  await page.mouse.move(100, 180);
  evidence.arrow = await state(page, "default");
  const cursorIdentity = await page
    .locator("[data-pink-cursor]")
    .elementHandle();
  const nav = page.getByRole("link", { name: "bio", exact: true });
  await nav.hover();
  evidence.link = await state(page, "pointer");
  await page.mouse.down();
  await state(page, "pointer");
  await page.mouse.move(100, 180);
  await page.mouse.up();
  const heading = page.getByRole("heading", {
    name: "Utility Mechanics of the Quantum Series",
  });
  await heading.hover();
  evidence.text = await state(page, "text");
  const h = await heading.boundingBox();
  assert.ok(h);
  await page.mouse.move(h.x + 8, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + h.width * 0.75, h.y + h.height / 2, {
    steps: 20,
  });
  await state(page, "text");
  const selected = await page.evaluate(() => ({
    text: getSelection()?.toString(),
    active: document.activeElement?.tagName,
  }));
  assert.ok(selected.text!.length > 15);
  assert.equal(selected.active, "BODY");
  await page.screenshot({ path: `${output}/heading-selection.png` });
  await page.mouse.up();
  evidence.selection = selected;

  await page.evaluate(() => {
    const fixture = document.createElement("section");
    fixture.id = "cursor-fixture";
    fixture.style.cssText =
      "position:fixed;inset:190px auto auto 30px;width:680px;z-index:100;background:#161616;padding:12px";
    fixture.innerHTML = `<button id="nested"><svg width="30" height="30"><path d="M0 0h30v30H0Z"/></svg></button>
      <button id="disabled" disabled><span>Disabled</span></button><button id="aria" aria-disabled="true"><span>Unavailable</span></button>
      <input id="edit" aria-label="Fixture input" value="abc" style="display:block;width:250px;color:white">
      <textarea id="resize" aria-label="Fixture textarea" style="display:block;width:250px;height:80px;resize:both;color:white">editable text</textarea>
      <div id="editable" contenteditable="true" style="width:250px">editable content</div>
      <select id="picker"><option>A</option><option>B</option></select><input id="file" type="file">
      <div id="functional" style="height:45px;width:250px;cursor:ew-resize!important">Functional cursor</div>
      <div id="pseudo" style="position:relative;height:45px;width:250px">Generated overlay</div>
      <div id="drag" draggable="true" style="height:45px;width:250px;cursor:grab">Draggable artwork</div>
      <div id="drop" style="position:absolute;left:350px;top:320px;width:180px;height:60px">Drop target</div>
      <iframe id="foreign" src="http://127.0.0.1:3045/cursor-frame" style="position:absolute;left:350px;top:100px;width:250px;height:100px"></iframe>`;
    const style = document.createElement("style");
    style.textContent =
      "#pseudo::before {content:'';position:absolute;inset:0;cursor:help!important}";
    fixture.append(style);
    document.body.append(fixture);
  });
  await page.locator("#nested path").hover();
  evidence.svg = await state(page, "pointer");
  await page.locator("#disabled span").hover();
  evidence.disabled = await state(page, "not-allowed");
  await page.locator("#aria span").hover();
  await state(page, "not-allowed");
  await page
    .locator("#aria")
    .evaluate((el) => el.removeAttribute("aria-disabled"));
  await state(page, "pointer");
  const edit = page.locator("#edit");
  await edit.click();
  await state(page, "text");
  await page.keyboard.press("End");
  await page.keyboard.type("def");
  assert.equal(await edit.inputValue(), "abcdef");
  const insertion = await edit.evaluate((el) => {
    const input = el as HTMLInputElement;
    return {
      active: el === document.activeElement,
      caret: getComputedStyle(el).caretColor,
      selectionStart: input.selectionStart,
      selectionEnd: input.selectionEnd,
    };
  });
  assert.equal(insertion.active, true);
  assert.equal(insertion.selectionStart, 6);
  assert.equal(insertion.selectionEnd, 6);
  assert.notEqual(insertion.caret, "rgba(0, 0, 0, 0)");
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.type("Z");
  assert.equal(await edit.inputValue(), "abcdeZ");
  const textarea = page.locator("#resize");
  await textarea.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\nsecond line");
  assert.ok((await textarea.inputValue()).includes("second line"));
  const before = await textarea.boundingBox();
  assert.ok(before);
  await page.mouse.move(
    before.x + before.width - 3,
    before.y + before.height - 3,
  );
  evidence.resize = await state(page, "nwse-resize");
  await page.mouse.down();
  await page.mouse.move(
    before.x + before.width + 42,
    before.y + before.height + 27,
    { steps: 10 },
  );
  await state(page, "nwse-resize");
  await page.mouse.up();
  const after = await textarea.boundingBox();
  assert.ok(after);
  assert.ok(
    after.width > before.width + 20 && after.height > before.height + 10,
  );
  await page.locator("#editable").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" remains editable");
  assert.ok(
    (await page.locator("#editable").innerText()).includes("remains editable"),
  );
  await state(page, "text");
  evidence.editing = {
    insertion,
    typed: "abcdeZ",
    textareaBefore: before,
    textareaAfter: after,
    contenteditable: true,
  };
  await page.locator("#functional").hover();
  await state(page, "ew-resize");
  await page.locator("#edit").hover();
  assert.equal(
    await page
      .locator("#functional")
      .evaluate((el) => [
        (el as HTMLElement).style.cursor,
        (el as HTMLElement).style.getPropertyPriority("cursor"),
      ])
      .then(JSON.stringify),
    JSON.stringify(["ew-resize", "important"]),
  );
  await page.locator("#pseudo").hover();
  assert.equal(
    await page
      .locator("#pseudo")
      .evaluate((el) => getComputedStyle(el, "::before").cursor),
    "none",
  );
  evidence.pseudoAndImportant = true;
  const modes = [
    "default",
    "pointer",
    "text",
    "vertical-text",
    "not-allowed",
    "ew-resize",
    "ns-resize",
    "nwse-resize",
    "nesw-resize",
    "col-resize",
    "row-resize",
    "move",
    "grab",
    "grabbing",
    "crosshair",
    "wait",
    "progress",
    "zoom-in",
    "zoom-out",
    "help",
    "copy",
    "alias",
    "no-drop",
    "cell",
    "context-menu",
    "all-scroll",
  ];
  const maskImages: Record<string, string> = {};
  for (const mode of modes) {
    await page
      .locator("#functional")
      .evaluate(
        (el, mode) =>
          (el as HTMLElement).style.setProperty("cursor", mode, "important"),
        mode,
      );
    await page.locator("#functional").hover();
    const result = await state(page, mode);
    maskImages[mode] = result.mask;
    await page
      .locator("[data-pink-cursor] span")
      .screenshot({ path: `${output}/shape-${mode}.png` });
  }
  evidence.states = modes;
  await page.locator("#edit").hover();
  await page
    .locator("#functional")
    .evaluate((el) =>
      (el as HTMLElement).style.setProperty("cursor", "none", "important"),
    );
  await page.locator("#functional").hover();
  await native(page);
  assert.equal(
    await page
      .locator("#functional")
      .evaluate((el) => (el as HTMLElement).style.cursor),
    "none",
  );
  await page.locator("#picker").hover();
  await native(page);
  await page.locator("#picker").selectOption("B");
  assert.equal(await page.locator("#picker").inputValue(), "B");
  await page.locator("#file").hover();
  await native(page);
  await page.locator("#foreign").hover();
  await native(page);
  await page.frameLocator("#foreign").getByRole("button").click();
  await page.locator("#edit").hover();
  await state(page, "text");
  evidence.nativeBoundaries = [
    "select/value change",
    "file control",
    "cross-origin iframe/click",
    "authored cursor:none",
    "re-entry",
  ];
  await page.locator("#drag").hover();
  await state(page, "grab");
  await page.mouse.down();
  await state(page, "grabbing");
  const drag = await page.locator("#drag").boundingBox();
  assert.ok(drag);
  await page.mouse.move(drag.x + drag.width + 80, drag.y + 20, { steps: 12 });
  await native(page);
  await page.mouse.up();
  await page.locator("#edit").hover();
  await state(page, "text");
  evidence.nativeDrag = true;
  // DOM replacement under a stationary pointer, as with a route or portal commit.
  await page.locator("#edit").hover();
  await page.locator("#edit").evaluate((el) => {
    const b = document.createElement("button");
    b.id = "replacement";
    b.textContent = "Replacement";
    b.style.cssText = el.getAttribute("style")!;
    el.replaceWith(b);
  });
  await state(page, "pointer");
  evidence.stationaryReplacement = true;
  await page.locator("#cursor-fixture").evaluate((el) => el.remove());
  await page.getByRole("link", { name: "bio", exact: true }).click();
  await page.waitForURL(`${origin}/bio-waambat`);
  await page.getByRole("heading", { name: "WAAMBAT", exact: true }).hover();
  await state(page, "text");
  await page.goBack();
  await page.waitForURL(`${origin}/mechanics`);
  await page.goForward();
  await page.waitForURL(`${origin}/bio-waambat`);
  assert.equal(
    await cursorIdentity!.evaluate(
      (el) => el === document.querySelector("[data-pink-cursor]"),
    ),
    true,
  );
  evidence.routes =
    "Real Next link + Back/Forward preserve a single cursor node; no mocked route responses.";

  await page.goto(`${origin}/art-by-waambat`);
  const view = page.locator(".archive-expand").first();
  await view.hover();
  await state(page, "pointer");
  await view.click();
  const viewer = page.getByRole("dialog", { name: "Archive artwork viewer" });
  await viewer.waitFor();
  await viewer
    .getByRole("button", { name: "Next artwork", exact: true })
    .hover();
  evidence.archive = await state(page, "pointer");
  await viewer
    .getByRole("button", { name: "Next artwork", exact: true })
    .click();
  await viewer.getByRole("button", { name: "info", exact: true }).click();
  await page.screenshot({ path: `${output}/archive-dialog.png` });
  await viewer.getByRole("button", { name: "Close archive viewer" }).click();
  await viewer.waitFor({ state: "hidden" });
  await page.mouse.move(100, 180);
  await state(page, "default");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/mechanics`);
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  await menu.click();
  const dialog = page.getByRole("dialog", {
    name: "Main navigation",
    exact: true,
  });
  await dialog.waitFor();
  const menuBio = dialog.getByRole("link", { name: "bio", exact: true });
  await menuBio.hover();
  evidence.menu = await state(page, "pointer");
  await page.screenshot({ path: `${output}/menu-dialog.png` });
  await page.keyboard.press("Tab");
  assert.equal(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
    true,
  );
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  assert.equal(
    await menu.evaluate((el) => el === document.activeElement),
    true,
  );
  assert.notEqual(
    await menu.evaluate((el) => getComputedStyle(el).outlineStyle),
    "none",
  );
  await menu.click();
  await dialog.waitFor();
  await menuBio.click();
  await page.waitForURL(`${origin}/bio-waambat`);
  await dialog.waitFor({ state: "hidden" });
  await page.mouse.move(10, 180);
  await state(page, "default");
  evidence.keyboard =
    "Editing selection/caret, dialog Tab containment, Escape focus return, visible keyboard outline preserved.";
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.mouse.move(10, 180);
  await state(page, "default");
  assert.equal(
    await page
      .locator("[data-pink-cursor] span")
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const ink = page.locator("[data-pink-cursor] span");
  const gradient = await ink.evaluate(
    (el) => getComputedStyle(el).backgroundPosition,
  );
  const pixels = await ink.screenshot();
  await page.waitForTimeout(240);
  assert.notEqual(
    await ink.evaluate((el) => getComputedStyle(el).backgroundPosition),
    gradient,
  );
  assert.notDeepEqual(await ink.screenshot(), pixels);
  evidence.animation =
    "Existing gradient changes computed position and rendered pixels; reduced motion is static.";
  // Blur/cancel release suppression; actual mouse movement restores it.
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await native(page);
  await page.mouse.move(12, 180);
  await state(page, "default");
  await page.evaluate(() =>
    document.dispatchEvent(new PointerEvent("pointercancel")),
  );
  await native(page);
  await page.mouse.move(14, 180);
  await state(page, "default");
  await page.locator("[data-pink-cursor]").evaluate((el) => el.remove());
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.body).cursor),
    "auto",
  );
  evidence.removalFallback =
    "Removing the overlay immediately restores native CSS via :has; no invisible-cursor dependency.";
  assert.deepEqual(errors, []);
  evidence.pageErrors = errors;

  const touch = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  await touch.route("**/*", (r) =>
    r.request().url().startsWith(origin) ? r.continue() : r.abort(),
  );
  const tp = await touch.newPage();
  await tp.goto(`${origin}/mechanics`);
  await tp.locator("[data-cursor-ready]").waitFor({ state: "attached" });
  await tp.getByRole("button", { name: "Menu", exact: true }).tap();
  await tp
    .getByRole("dialog", { name: "Main navigation" })
    .getByRole("link", { name: "bio", exact: true })
    .tap();
  await tp.waitForURL(`${origin}/bio-waambat`);
  assert.equal(
    await tp.evaluate(() =>
      document.documentElement.hasAttribute("data-waambat-cursor"),
    ),
    false,
  );
  assert.equal(
    await tp
      .locator("[data-pink-cursor]")
      .evaluate((el) => getComputedStyle(el).display),
    "none",
  );
  evidence.touch =
    "Actual 390px touch menu/navigation; no custom cursor or suppression.";
  await touch.close();
  const failure = await browser.newContext();
  await failure.route("**/*", (r) =>
    r.request().url().startsWith(origin) ? r.continue() : r.abort(),
  );
  await failure.addInitScript(() =>
    Object.defineProperty(HTMLElement.prototype, "showPopover", {
      value: undefined,
    }),
  );
  const fp = await failure.newPage();
  await fp.goto(`${origin}/mechanics`);
  await fp.getByRole("link", { name: "bio", exact: true }).hover();
  assert.equal(
    await fp.evaluate(() =>
      document.documentElement.hasAttribute("data-waambat-cursor"),
    ),
    false,
  );
  assert.equal(
    await fp
      .getByRole("link", { name: "bio", exact: true })
      .evaluate((el) => getComputedStyle(el).cursor),
    "pointer",
  );
  evidence.featureFallback =
    "Unsupported top-layer API keeps native cursor and links usable.";
  await failure.close();
  // A compact visual reference of the actual masks, for human shape review.
  const sheet = await context.newPage();
  await sheet.setViewportSize({ width: 800, height: 600 });
  await sheet.setContent(
    `<body style="margin:0;background:#161616;color:white;font:14px system-ui;display:grid;grid-template-columns:repeat(6,1fr);gap:10px;padding:20px">${Object.entries(
      maskImages,
    )
      .map(
        ([mode, mask]) =>
          `<div style="height:95px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:15px"><span style='width:32px;height:36px;background:linear-gradient(120deg,#fff0f6,#ff94b2,#c60064,#ff70c5);mask-image:${mask};mask-size:contain;mask-repeat:no-repeat;mask-position:center'></span>${mode}</div>`,
      )
      .join("")}</body>`,
  );
  await sheet.screenshot({ path: `${output}/cursor-shapes.png` });
  await writeFile(
    `${output}/cursor-check.json`,
    JSON.stringify(evidence, null, 2) + "\n",
  );
  assert.equal(
    child?.exitCode ?? null,
    null,
    "Local test server must remain running",
  );
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser?.close();
  child?.kill();
}
