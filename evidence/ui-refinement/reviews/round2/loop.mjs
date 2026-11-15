// Does a hover burst re-trigger itself while the pointer rests still? Count animationstart events over 2s
// with the pointer parked at several heights inside the target (0.1 .. 0.9 of its box).
import { chromium, base, shots, save, guard, settle } from './lib.mjs';
const b = await chromium.launch();
const R = {};
async function probe(ctxOpts, path, sel, label, idx = 0, prep = null) {
  const ctx = await b.newContext({ ...ctxOpts, colorScheme: 'dark' }); await guard(ctx);
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__starts = []; addEventListener('animationstart', e => { if (/mosh/.test(e.animationName)) window.__starts.push([Math.round(performance.now()), e.animationName]); }, true); });
  await page.goto(base + path); await settle(page, 1500);
  if (prep) await prep(page);
  const loc = page.locator(sel).nth(idx);
  if (!(await loc.count())) { R[label] = 'not found'; await ctx.close(); return; }
  await loc.scrollIntoViewIfNeeded(); await page.waitForTimeout(1200);
  const bb = await loc.boundingBox();
  const res = {};
  for (const f of [0.1, 0.3, 0.5, 0.7, 0.9]) {
    await page.mouse.move(2, bb.y + bb.height + 300 > 0 ? 2 : 2); await page.waitForTimeout(400);
    await page.evaluate(() => { window.__starts = []; });
    await page.mouse.move(bb.x + bb.width * 0.4, bb.y + bb.height * f);
    if (f === 0.5) { await page.waitForTimeout(150); await page.screenshot({ path: shots + `loop-${label}.png`, clip: { x: Math.max(0, bb.x - 20), y: Math.max(0, bb.y - 20), width: bb.width + 40, height: bb.height + 40 } }); await page.waitForTimeout(1850); }
    else await page.waitForTimeout(2000);
    res['y' + f] = (await page.evaluate(() => window.__starts)).length;
  }
  R[label] = { box: [bb.x, bb.y, bb.width, bb.height].map(Math.round), startsIn2s: res };
  await ctx.close();
}
const desk = { viewport: { width: 1440, height: 900 } };
await probe(desk, '/contact-waambat', 'header nav a', 'desktop-nav', 3);
await probe(desk, '/contact-waambat', 'header nav a[aria-current=page]', 'desktop-nav-current');
await probe(desk, '/contact-waambat', 'a.site-logo', 'header-wordmark');
await probe(desk, '/', '[data-hero-wordmark] a', 'hero-wordmark');
await probe(desk, '/', '.original-artwork .artwork-caption h2 a', 'caption-title');
await probe(desk, '/instagram', '.source-inline-link', 'inline-link');
await probe(desk, '/', '.media-control', 'media-control');
const openMenu = async page => { await page.locator('header button[aria-label="Menu"]').click(); await page.waitForTimeout(1200); };
await probe({ viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 }, '/mechanics', '#mobile-site-menu nav a', 'zoom200-menu-link', 3, openMenu);
// Same check with reduced motion: should be 0 everywhere
await probe({ ...desk, reducedMotion: 'reduce' }, '/contact-waambat', 'header nav a', 'desktop-nav-reduced', 3);
save('loop.json', R);
console.log(JSON.stringify(R, null, 1));
await b.close();
