import { chromium, base, shot, watchConsole, log } from './lib.mjs';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
const page = await c.newPage(); watchConsole(page, 'media');
const res = {};
const reqs = [];
let originals = 'hold';
let releaseHold;
await page.route(/media-originals|\/originals?\//, async (route) => {
  reqs.push({ url: route.request().url().slice(-90), method: route.request().method(), mode: originals });
  if (originals === 'hold') { await new Promise(r => { releaseHold = r; setTimeout(r, 4000); }); return route.abort(); }
  if (originals === 'fail') return route.abort();
  return route.continue();
});
page.on('request', r => { if (/\.(mp4|webm|mov|png|jpe?g|gif|webp|avif)/.test(r.url()) && /original/.test(r.url())) reqs.push({ seen: r.url().slice(-90), m: r.method() }); });
await page.goto(base + '/', { waitUntil: 'load' }); await page.waitForTimeout(2500);
const controls = page.locator('.media-control');
res.homeControls = await controls.count();
const ctl = controls.first();
await ctl.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
res.ctlRest = await ctl.evaluate(e => { const s = getComputedStyle(e); return { label: e.getAttribute('aria-label'), color: s.color, border: s.borderColor, bg: s.backgroundColor, opacity: s.opacity }; });
const art = ctl.locator('xpath=ancestor::*[self::figure or contains(@class,"artwork-media") or contains(@class,"painting")][1]');
await ctl.hover(); await page.waitForTimeout(350);
res.ctlHover = await ctl.evaluate(e => { const s = getComputedStyle(e); return { color: s.color, border: s.borderColor, bg: s.backgroundColor, opacity: s.opacity, cursor: document.querySelector('.waambat-cursor').dataset.cursorState }; });
const cb = await ctl.boundingBox();
const clip = { x: Math.max(0, cb.x - 80), y: Math.max(0, cb.y - 60), width: 260, height: 170 };
await shot(page, 'media-control-hover', { clip });
await page.mouse.down(); await page.waitForTimeout(150);
res.ctlPressed = await ctl.evaluate(e => { const s = getComputedStyle(e); return { color: s.color, border: s.borderColor, transform: s.transform }; });
await shot(page, 'media-control-pressed', { clip });
await page.mouse.up(); await page.waitForTimeout(400);
res.ctlAfterClick = await ctl.evaluate(e => ({ label: e.getAttribute('aria-label'), focus: document.activeElement === e, outline: getComputedStyle(e).outline }));
await ctl.click(); await page.waitForTimeout(300);
res.ctlToggleBack = await ctl.evaluate(e => e.getAttribute('aria-label'));
// keyboard focus ring on control
await page.mouse.move(5, 450);
await ctl.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await page.waitForTimeout(200);
res.ctlFocus = await page.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); return { cls: e.className, outline: s.outline, offset: s.outlineOffset }; });
await shot(page, 'media-control-focus', { clip });
// Right-click artwork -> Save dialog
const media = page.locator('main img, main video').first();
await media.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
const mb = await media.boundingBox();
await page.mouse.click(mb.x + mb.width / 2, mb.y + mb.height / 2, { button: 'right' });
await page.waitForTimeout(250);
res.savePreparing = await page.evaluate(() => { const d = document.querySelector('dialog.waambat-download'); return { open: d.open, h2: d.querySelector('h2').textContent, status: d.querySelector('[role=status]')?.textContent, focus: document.activeElement?.className || document.activeElement?.tagName, cursorShown: getComputedStyle(document.querySelector('.waambat-cursor')).opacity, border: getComputedStyle(d).borderColor, bg: getComputedStyle(d).backgroundColor }; });
await shot(page, 'save-preparing');
// hover cancel and close
const cancel = page.locator('.waambat-download-cancel');
await cancel.hover(); await page.waitForTimeout(250);
res.cancelHover = await cancel.evaluate(e => getComputedStyle(e).color);
const closeX = page.locator('.waambat-download-close');
await closeX.hover(); await page.waitForTimeout(250);
res.closeHover = await closeX.evaluate(e => getComputedStyle(e).color);
await shot(page, 'save-close-hover');
// cancel
await cancel.click(); await page.waitForTimeout(400);
res.afterCancel = await page.evaluate(() => ({ open: document.querySelector('dialog.waambat-download').open, focus: document.activeElement?.tagName, overflow: document.body.style.overflow }));
releaseHold?.();
// failure -> retry
originals = 'fail';
await page.mouse.click(mb.x + mb.width / 2, mb.y + mb.height / 2, { button: 'right' });
await page.waitForTimeout(1500);
res.saveError = await page.evaluate(() => { const d = document.querySelector('dialog.waambat-download'); const btn = d.querySelector('[role=alert] button'); return { h2: d.querySelector('h2').textContent, alert: d.querySelector('[role=alert]')?.textContent, retry: btn ? { text: btn.textContent, color: getComputedStyle(btn).color, bg: getComputedStyle(btn).backgroundColor, border: getComputedStyle(btn).borderStyle + ' ' + getComputedStyle(btn).borderColor, decoration: getComputedStyle(btn).textDecorationLine, padding: getComputedStyle(btn).padding } : null, alertColor: d.querySelector('[role=alert] p') && getComputedStyle(d.querySelector('[role=alert] p')).color }; });
await shot(page, 'save-error');
if (res.saveError.retry) {
  const retry = page.locator('.waambat-download [role=alert] button');
  await retry.hover(); await page.waitForTimeout(250);
  res.retryHover = await retry.evaluate(e => getComputedStyle(e).color);
  await shot(page, 'save-error-retry-hover');
  originals = 'pass-head';
  await page.unroute(/media-originals|\/originals?\//);
  await page.route(/media-originals|\/originals?\//, async (route) => { reqs.push({ url: route.request().url().slice(-90), method: route.request().method(), mode: 'retry' }); if (route.request().method() === 'HEAD') return route.continue(); return route.abort(); });
  await retry.click(); await page.waitForTimeout(250);
  res.retryPreparing = await page.evaluate(() => document.querySelector('dialog.waambat-download h2').textContent);
  await page.waitForTimeout(3000);
  res.afterRetry = await page.evaluate(() => { const d = document.querySelector('dialog.waambat-download'); const a = d.querySelector('.waambat-download-save'); return { h2: d.querySelector('h2').textContent, alert: d.querySelector('[role=alert]')?.textContent, save: a ? { href: a.getAttribute('href')?.slice(0, 60), dl: a.getAttribute('download'), color: getComputedStyle(a).color, bg: getComputedStyle(a).backgroundColor } : null, info: d.querySelector('.waambat-download-info')?.textContent }; });
  await shot(page, 'save-after-retry');
  const save = page.locator('.waambat-download-save');
  if (await save.count()) {
    await save.hover(); await page.waitForTimeout(300);
    res.saveHover = await save.evaluate(e => ({ color: getComputedStyle(e).color, bg: getComputedStyle(e).backgroundColor }));
    await shot(page, 'save-button-hover');
    await page.mouse.down(); await page.waitForTimeout(150);
    res.savePressed = await save.evaluate(e => ({ color: getComputedStyle(e).color, bg: getComputedStyle(e).backgroundColor }));
    await shot(page, 'save-button-pressed');
    await page.mouse.move(5, 5); await page.mouse.up();
  }
}
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
res.afterEscape = await page.evaluate(() => ({ open: document.querySelector('dialog.waambat-download').open }));
res.reqs = reqs.slice(0, 30); res.log = log;
writeFileSync(new URL('./media.json', import.meta.url), JSON.stringify(res, null, 2));
console.log(JSON.stringify(res, null, 2));
await b.close();
