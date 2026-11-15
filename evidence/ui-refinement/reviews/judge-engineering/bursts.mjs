// Engineering judge: re-check the round-2 burst blockers (hover loop, press swallowed) on the current source.
// Run: node bursts.mjs -> bursts.json
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const out = { hover: [], mousePress: [], touchTap: [] };
const browser = await chromium.launch();
const guard = (ctx) => ctx.route('**/*', (r) => (r.request().method() !== 'GET' || r.request().url().includes('/media-originals/') ? r.abort() : r.continue()));
// Hover loop: park on each desktop nav link for 2 s and count animationstart on it.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); await guard(ctx);
  const page = await ctx.newPage();
  await page.goto('http://localhost:3287/contact-waambat', { waitUntil: 'load' }); await page.waitForTimeout(1500);
  await page.evaluate(() => { window.__starts = 0; document.addEventListener('animationstart', (e) => { if (e.target.closest?.('.site-nav-link')) window.__starts++; }, true); });
  const links = await page.$$('header nav a.site-nav-link');
  for (const link of links.slice(0, 4)) {
    const box = await link.boundingBox();
    for (const f of [0.3, 0.5, 0.7]) {
      await page.mouse.move(5, 5); await page.waitForTimeout(400);
      await page.evaluate(() => { window.__starts = 0; });
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * f); await page.waitForTimeout(2000);
      out.hover.push({ link: (await link.textContent()).trim(), at: f, starts: await page.evaluate(() => window.__starts) });
    }
  }
  // Mouse press of realistic length on the "bio" link: does it navigate?
  for (const hold of [60, 100, 130]) for (const f of [0.3, 0.5, 0.75]) {
    await page.goto('http://localhost:3287/contact-waambat', { waitUntil: 'load' }); await page.waitForTimeout(800);
    const bio = await page.$('header nav a[href="/bio-waambat"]'); const b = await bio.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height * f); await page.mouse.down(); await page.waitForTimeout(hold); await page.mouse.up();
    await page.waitForTimeout(900);
    out.mousePress.push({ hold, at: f, landed: new URL(page.url()).pathname === '/bio-waambat' });
  }
  await ctx.close();
}
// Touch taps of realistic length on the mobile-menu "bio" link.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); await guard(ctx);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  for (const hold of [60, 100, 130]) for (const f of [0.3, 0.5, 0.75]) {
    await page.goto('http://localhost:3287/mechanics', { waitUntil: 'load' }); await page.waitForTimeout(800);
    await page.tap('header button[aria-label="Menu"]'); await page.waitForTimeout(900);
    const bio = await page.$('#mobile-site-menu a[href="/bio-waambat"]'); const b = await bio.boundingBox();
    const p = { x: b.x + b.width / 2, y: b.y + b.height * f };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] });
    await page.waitForTimeout(hold);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(1200);
    out.touchTap.push({ hold, at: f, landed: new URL(page.url()).pathname === '/bio-waambat' });
  }
  await ctx.close();
}
out.summary = { maxHoverStarts: Math.max(...out.hover.map((h) => h.starts)), mouseLanded: `${out.mousePress.filter((x) => x.landed).length}/${out.mousePress.length}`, touchLanded: `${out.touchTap.filter((x) => x.landed).length}/${out.touchTap.length}` };
writeFileSync(new URL('./bursts.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.summary), JSON.stringify(out.hover.map((h) => h.starts)));
await browser.close();
