// Cursor readability (keyline pixels) over a pink title, the hovered submit and a light artwork; press split; rail colours at rest/hover/drag.
import { chromium, guard, go, save, shots, sharp, toHex } from './lib.mjs';
const b = await chromium.launch(); const R = { cursor: {}, rail: {} };
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' }); await guard(ctx);
const page = await ctx.newPage();
async function grab(label, x, y, press = false) {
  await page.mouse.move(x - 3, y - 3); await page.waitForTimeout(60); await page.mouse.move(x, y); await page.waitForTimeout(350);
  if (press) { await page.mouse.down(); await page.waitForTimeout(40); }
  const st = await page.evaluate(() => { const c = document.querySelector('.waambat-cursor'); return c ? { state: c.dataset.cursorState, filter: getComputedStyle(c).filter.slice(0, 60), display: getComputedStyle(c).display, pressed: c.hasAttribute('data-pressed') } : null; });
  const buf = await page.screenshot({ clip: { x: x - 8, y: y - 8, width: 40, height: 44 } });
  if (press) await page.mouse.up();
  await sharp(buf).resize(240, 264, { kernel: 'nearest' }).toFile(`${shots}cursor-${label}.png`);
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  let dark = 0, pink = 0; for (let i = 0; i < data.length; i += info.channels) { const s = data[i] + data[i + 1] + data[i + 2]; if (s < 90) dark++; if (data[i] > 200 && data[i + 1] > 100 && data[i + 1] < 200 && data[i + 2] > 140 && data[i + 2] < 215) pink++; }
  R.cursor[label] = { ...st, darkPx: dark, pinkPx: pink };
}
await go(page, '/mechanics', 2000);
const h1 = await page.locator('main h1').first().boundingBox();
await grab('over-pink-title', h1.x + 60, h1.y + h1.height / 2);
await grab('over-black', 1200, 600);
await grab('press-on-black', 1200, 600, true);
const nav = await page.locator('header nav a').nth(2).boundingBox();
await grab('over-nav', nav.x + nav.width / 2, nav.y + nav.height / 2);
await go(page, '/contact-waambat', 2000);
const sub = page.locator('main button[type=submit]'); await sub.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
const sb = await sub.boundingBox();
await grab('over-submit-hover', sb.x + sb.width * 0.3, sb.y + sb.height / 2);
// Rail colours
await go(page, '/bio-waambat', 2000);
const rail = await page.evaluate(() => { const c = [...document.querySelectorAll('canvas')].find(c => { const r = c.getBoundingClientRect(); return r.width < 30 && r.height > 200; }); const r = c?.getBoundingClientRect(); return r ? [r.x, r.y, r.width, r.height] : null; });
R.rail.box = rail;
async function railPx(label) {
  const buf = await page.screenshot({ clip: { x: rail[0], y: rail[1], width: rail[2], height: Math.min(rail[3], 400) } });
  await sharp(buf).toFile(`${shots}rail-${label}.png`);
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const counts = {}; for (let i = 0; i < data.length; i += info.channels) { if (data[i] + data[i + 1] + data[i + 2] < 60) continue; const k = toHex([data[i] & 0xf0, data[i + 1] & 0xf0, data[i + 2] & 0xf0]); counts[k] = (counts[k] || 0) + 1; }
  R.rail[label] = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
}
if (rail) {
  await page.mouse.move(700, 400); await page.waitForTimeout(1500); await railPx('rest');
  await page.mouse.move(rail[0] + rail[2] / 2, rail[1] + 60); await page.waitForTimeout(500); await railPx('hover');
  await page.mouse.down(); await page.mouse.move(rail[0] + rail[2] / 2, rail[1] + 160, { steps: 6 }); await page.waitForTimeout(80); await railPx('drag'); await page.mouse.up();
  R.rail.scrolledByDrag = await page.evaluate(() => scrollY);
}
save('cursor.json', R); console.log(JSON.stringify(R, null, 0));
await b.close();
