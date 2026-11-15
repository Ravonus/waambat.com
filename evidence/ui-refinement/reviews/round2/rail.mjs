// Canvas scroll rail: pixels at rest / hover / drag, keyboard, focus ring, native fallback rules.
import { chromium, base, shots, save, settle, sharp } from './lib.mjs';
const b = await chromium.launch();
const R = {};
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' });
const page = await ctx.newPage(); await page.goto(base + '/'); await settle(page, 2000);
const pixels = () => page.evaluate(() => {
  const cv = document.querySelector('.waambat-scroll-rail canvas'); const c = cv.getContext('2d'); const W = cv.width, H = cv.height; const d = c.getImageData(0, 0, W, H).data;
  let top = -1, bottom = -1; const cols = new Set();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (d[i + 3] > 100) { if (top < 0) top = y; bottom = y; cols.add(x); } }
  const at = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
  const mid = Math.round((top + bottom) / 2), cx = [...cols].sort((a, b) => a - b);
  return { canvas: [W, H], thumbTop: top, thumbBottom: bottom, columns: cx, topColor: at(cx[Math.floor(cx.length / 2)], top + 3), midColor: at(cx[Math.floor(cx.length / 2)], mid), bottomColor: at(cx[Math.floor(cx.length / 2)], bottom - 3), leftEdge: at(cx[0], mid), rightEdge: at(cx.at(-1), mid) };
});
const railBox = await page.locator('.waambat-scroll-rail').boundingBox();
R.railBox = railBox;
R.attrs = await page.evaluate(() => { const r = document.querySelector('.waambat-scroll-rail'); return { role: r.getAttribute('role'), label: r.getAttribute('aria-label'), tabindex: r.getAttribute('tabindex'), orientation: r.getAttribute('aria-orientation'), now: r.getAttribute('aria-valuenow'), max: r.getAttribute('aria-valuemax') }; });
R.rest = await pixels();
await page.screenshot({ path: shots + 'rail-rest.png', clip: { x: 1400, y: 0, width: 40, height: 300 } });
await page.mouse.move(railBox.x + 9, railBox.y + 30); await page.waitForTimeout(300);
R.hover = await pixels();
await page.screenshot({ path: shots + 'rail-hover.png', clip: { x: 1400, y: 0, width: 40, height: 300 } });
await page.mouse.down(); await page.mouse.move(railBox.x + 9, railBox.y + 200, { steps: 8 }); await page.waitForTimeout(120);
R.drag = await pixels(); R.dragScrollY = await page.evaluate(() => scrollY);
await page.screenshot({ path: shots + 'rail-drag.png', clip: { x: 1400, y: 0, width: 40, height: 400 } });
const dragZoom = await page.screenshot({ clip: { x: 1416, y: R.drag.thumbTop / 2 - 10, width: 24, height: 80 } });
await sharp(dragZoom).resize(192, 640, { kernel: 'nearest' }).toFile(shots + 'rail-drag-zoom.png');
await page.mouse.up(); await page.waitForTimeout(300);
R.afterDrag = await pixels();
// keyboard
await page.evaluate(() => scrollTo(0, 0)); await page.mouse.move(700, 500); await page.waitForTimeout(300);
await page.locator('.waambat-scroll-rail').focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await page.waitForTimeout(200);
R.focus = await page.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return { isRail: a.classList.contains('waambat-scroll-rail'), outline: c.outline, bg: c.backgroundColor }; });
await page.screenshot({ path: shots + 'rail-focus.png', clip: { x: 1400, y: 0, width: 40, height: 300 } });
const keys = {};
for (const k of ['ArrowDown', 'PageDown', 'End', 'Home']) { await page.keyboard.press(k); await page.waitForTimeout(500); keys[k] = await page.evaluate(() => Math.round(scrollY)); }
R.keyboard = keys;
// Native fallback: the CSS used when the canvas rail is absent
R.native = await page.evaluate(() => { const h = document.documentElement; h.removeAttribute('data-canvas-scroll'); const c = getComputedStyle(h); const out = { scrollbarColor: c.scrollbarColor, scrollbarWidth: c.scrollbarWidth }; h.setAttribute('data-canvas-scroll', ''); return out; });
// Hidden while the menu is open (phone)
await ctx.close();
const m = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const mp = await m.newPage();
await mp.goto(base + '/'); await settle(mp, 1500);
R.phoneRail = await mp.evaluate(() => { const r = document.querySelector('.waambat-scroll-rail'); const b = r.getBoundingClientRect(); return { visible: getComputedStyle(r).visibility, hidden: r.hidden, rect: [b.x, b.y, b.width, b.height] }; });
await mp.locator('header button[aria-label="Menu"]').tap(); await mp.waitForTimeout(800);
R.phoneRailMenuOpen = await mp.evaluate(() => getComputedStyle(document.querySelector('.waambat-scroll-rail')).visibility);
await m.close();
save('rail.json', R); console.log(JSON.stringify(R, null, 1));
await b.close();
