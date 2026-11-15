// Save dialog (right-click on artwork) colours + cancel; title arrival fringe frames under full motion. Originals are blocked; nothing is downloaded.
import { chromium, guard, go, save, shots } from './lib.mjs';
const b = await chromium.launch(); const R = { save: {}, arrive: {} };
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', acceptDownloads: false }); const log = await guard(ctx);
const page = await ctx.newPage(); await go(page, '/ordinals', 2500);
const art = page.locator('main video, main img').first(); await art.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
const bb = await art.boundingBox();
await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2, { button: 'right' }); await page.waitForTimeout(1500);
const dlg = page.locator('dialog[open], [role=dialog]').first();
if (await dlg.count()) {
  R.save.buttons = await page.evaluate(() => { const d = document.querySelector('dialog[open], [role=dialog]'); const s = getComputedStyle(d); return { dialogBg: s.backgroundColor, border: s.borderColor, backdropFilter: s.backdropFilter, text: d.textContent.trim().replace(/\s+/g, ' ').slice(0, 160), buttons: [...d.querySelectorAll('button, a')].map(e => ({ t: e.textContent.trim().slice(0, 20), c: getComputedStyle(e).color, bg: getComputedStyle(e).backgroundColor, border: getComputedStyle(e).borderColor })) }; });
  R.save.backdrop = await page.evaluate(() => { const d = document.querySelector('dialog[open]'); return d ? getComputedStyle(d, '::backdrop').backdropFilter + ' | ' + getComputedStyle(d, '::backdrop').backgroundColor : null; });
  await page.screenshot({ path: shots + 'save-dialog.png' });
  const cancel = dlg.locator('button', { hasText: /cancel|close/i }).first();
  if (await cancel.count()) { const cb = await cancel.boundingBox(); await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2); await page.waitForTimeout(300); R.save.cancelHover = await cancel.evaluate(e => getComputedStyle(e).color); await page.screenshot({ path: shots + 'save-dialog-cancel-hover.png' }); await cancel.click(); await page.waitForTimeout(500); }
  R.save.closedAfterCancel = (await page.locator('dialog[open]').count()) === 0;
} else R.save.none = true;
R.save.blocked = log.length;
await ctx.close();
// Title arrival frames (full motion)
const c2 = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' }); await guard(c2);
const p2 = await c2.newPage(); await go(p2, '/bio-waambat', 0);
await p2.waitForSelector('main h1');
const names = await p2.evaluate(() => document.getAnimations().map(a => a.animationName).filter(Boolean));
R.arrive.names = [...new Set(names)];
await p2.evaluate(() => { for (const a of document.getAnimations()) if (/title-arrive/.test(a.animationName)) { a.pause(); a.currentTime = 120; } });
const h = await p2.locator('main h1').first().boundingBox();
if (h) await p2.screenshot({ path: shots + 'title-arrive-120ms.png', clip: { x: h.x - 10, y: h.y - 10, width: Math.min(h.width + 20, 700), height: h.height + 20 } });
R.arrive.shadow = await p2.evaluate(() => getComputedStyle(document.querySelector('main h1')).textShadow);
await c2.close();
save('save.json', R); console.log(JSON.stringify(R, null, 0));
await b.close();
