import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const base = 'http://localhost:3287', dir = new URL('./', import.meta.url).pathname, R = {};
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
await ctx.route('**/*', (r) => ['GET', 'HEAD'].includes(r.request().method()) ? r.continue() : r.abort());
// splash pages
for (const p of ['/waambat', '/lindsay-scoggins']) {
  const page = await ctx.newPage(); await page.goto(base + p, { waitUntil: 'load' }); await page.waitForTimeout(2000);
  await page.screenshot({ path: dir + 'v-splash' + p.replace('/', '-') + '.png' });
  R[p] = await page.evaluate(() => [...document.querySelectorAll('a,button')].filter(e => e.getBoundingClientRect().width).slice(0, 8).map(e => ({ t: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 25), color: getComputedStyle(e).color, border: getComputedStyle(e).borderTopColor })));
  const b = page.locator('.legacy-foundation-button, .legacy-socials a').first();
  if (await b.count()) { await b.hover(); await page.waitForTimeout(300); R[p + ' hover'] = await page.evaluate(() => { const e = document.querySelector('.legacy-foundation-button, .legacy-socials a'); const c = getComputedStyle(e); return { color: c.color, bg: c.backgroundColor, border: c.borderTopColor }; }); }
  await page.close();
}
// caption title link: hover + scroll-driven fringe
{
  const page = await ctx.newPage(); await page.goto(base + '/', { waitUntil: 'load' }); await page.waitForTimeout(2500);
  const info = await page.evaluate(() => { const a = document.querySelector('.original-artwork .artwork-caption h2 a'); if (!a) return null; const r = a.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; });
  R.caption = info;
  if (info) {
    // place the caption title near the bottom edge (inside its entry range) and stop scrolling
    await page.evaluate((t) => scrollTo(0, t.top - innerHeight + t.h * 0.6), info); await page.waitForTimeout(800);
    R.captionAtRestEntering = await page.evaluate(() => getComputedStyle(document.querySelector('.original-artwork .artwork-caption h2')).textShadow);
    const box = await page.locator('.original-artwork .artwork-caption h2 a').first().boundingBox();
    await page.mouse.move(box.x + 20, box.y + box.height / 2); await page.waitForTimeout(400);
    R.captionHoverEntering = await page.evaluate(() => { const a = document.querySelector('.original-artwork .artwork-caption h2 a'); return { color: getComputedStyle(a).color, shadow: getComputedStyle(a).textShadow }; });
    await page.screenshot({ path: dir + 'v-caption-fringe-hover.png', clip: { x: Math.max(0, box.x - 20), y: Math.max(0, box.y - 20), width: Math.min(500, box.width + 60), height: Math.min(80, 900 - box.y + 20) } });
    await page.evaluate((t) => scrollTo(0, t.top - 300), info); await page.waitForTimeout(600);
    const b2 = await page.locator('.original-artwork .artwork-caption h2 a').first().boundingBox();
    await page.mouse.move(b2.x + 20, b2.y + b2.height / 2); await page.waitForTimeout(400);
    R.captionHoverResolved = await page.evaluate(() => { const a = document.querySelector('.original-artwork .artwork-caption h2 a'); return { color: getComputedStyle(a).color, shadow: getComputedStyle(a).textShadow }; });
    // cursor over a light region of artwork: find brightest 30x30 block in a screenshot
    const buf = await page.screenshot();
    R.note = 'see v-cursor-light';
  }
  await page.close();
}
// cursor over light artwork: art archive, sample pixels to find a bright spot
{
  const page = await ctx.newPage(); await page.goto(base + '/art-by-waambat', { waitUntil: 'load' }); await page.waitForTimeout(3000);
  await page.evaluate(() => scrollTo(0, 700)); await page.waitForTimeout(1500);
  const spot = await page.evaluate(async () => {
    // draw visible images to canvas is CORS-blocked possibly; use elementFromPoint scanning of img and their bright CSS? fall back to centre of the first image
    const imgs = [...document.querySelectorAll('main img')].filter(i => { const r = i.getBoundingClientRect(); return r.width > 100 && r.top > 0 && r.bottom < innerHeight; });
    for (const img of imgs) { try { const c = document.createElement('canvas'); c.width = 40; c.height = 40; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 40, 40); const d = g.getImageData(0, 0, 40, 40).data; let best = -1, bi = 0; for (let i = 0; i < d.length; i += 4) { const l = d[i] + d[i + 1] + d[i + 2]; if (l > best) { best = l; bi = i / 4; } } const r = img.getBoundingClientRect(); if (best > 600) return { x: r.x + (bi % 40 + 0.5) * r.width / 40, y: r.y + (Math.floor(bi / 40) + 0.5) * r.height / 40, best }; } catch (e) { } }
    return null; });
  R.lightSpot = spot;
  if (spot) { await page.mouse.move(spot.x - 4, spot.y - 4); await page.waitForTimeout(500); await page.screenshot({ path: dir + 'v-cursor-light.png', clip: { x: Math.max(0, spot.x - 60), y: Math.max(0, spot.y - 50), width: 140, height: 120 } }); }
  await page.close();
}
await browser.close();
writeFileSync(dir + 'extra.json', JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1));
