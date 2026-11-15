import { chromium, base, shot, watchConsole, log } from './lib.mjs';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
const page = await c.newPage(); watchConsole(page, 'archive');
const res = {};
const cur = () => page.evaluate(() => { const p = document.querySelector('.waambat-cursor'); return { state: p.dataset.cursorState, opacity: p.style.opacity, root: document.documentElement.dataset.waambatCursor || null }; });
await page.goto(base + '/art-by-waambat', { waitUntil: 'load' }); await page.waitForTimeout(2000);
const tile = page.locator('.archive-tile').nth(1);
await tile.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
await tile.hover(); await page.waitForTimeout(300);
const exp = tile.locator('.archive-expand');
res.expandOnHover = await exp.evaluate(e => ({ opacity: getComputedStyle(e).opacity, color: getComputedStyle(e).color }));
await exp.hover(); await page.waitForTimeout(250);
res.expandHover = await exp.evaluate(e => ({ color: getComputedStyle(e).color, border: getComputedStyle(e).borderColor }));
const tb = await tile.boundingBox();
await shot(page, 'archive-expand-hover', { clip: { x: tb.x, y: tb.y, width: Math.min(tb.width, 600), height: Math.min(tb.height, 300) } });
await exp.click(); await page.waitForTimeout(800);
res.viewerOpen = await page.evaluate(() => { const d = document.querySelector('dialog.archive-viewer'); return { open: d.open, focus: document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName, closeColor: getComputedStyle(d.querySelector('.archive-close')).color, hasIframe: !!d.querySelector('iframe'), hasVideoControls: !!d.querySelector('video[controls]'), buttons: [...d.querySelectorAll('button')].map(b => [b.textContent.trim(), getComputedStyle(b).color]) }; });
await shot(page, 'archive-viewer-open');
const closeB = page.locator('.archive-close');
await closeB.hover(); await page.waitForTimeout(250);
res.closeHover = await closeB.evaluate(e => getComputedStyle(e).color);
res.closeCursor = await cur();
const next = page.locator('dialog.archive-viewer button[aria-label="Next artwork"]');
await next.hover(); await page.waitForTimeout(250);
res.nextHover = await next.evaluate(e => getComputedStyle(e).color);
await shot(page, 'archive-viewer-next-hover', { clip: await next.boundingBox().then(bb => ({ x: bb.x - 150, y: bb.y - 40, width: 320, height: 100 })) });
await next.click(); await page.waitForTimeout(500);
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(500);
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
res.afterEscape = await page.evaluate(() => ({ open: document.querySelector('dialog.archive-viewer').open, focus: document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName, overflow: document.body.style.overflow }));
// Open a video embed tile (if any) to test native controls / iframe cursor fallback
const vidTile = page.locator('.archive-tile:has(video), .archive-tile:has([class*=inline-video])').first();
if (await vidTile.count()) {
  await vidTile.scrollIntoViewIfNeeded(); await vidTile.hover(); await page.waitForTimeout(300);
  await shot(page, 'archive-inline-video-hover', { clip: await vidTile.boundingBox().then(bb => ({ x: bb.x, y: bb.y, width: Math.min(bb.width, 700), height: Math.min(bb.height, 400) })) });
  res.inlineVideoControls = await vidTile.evaluate(t => [...t.querySelectorAll('.media-control')].map(b => [b.getAttribute('aria-label'), getComputedStyle(b).opacity]));
  await vidTile.locator('.archive-expand').click(); await page.waitForTimeout(2500);
  res.videoViewer = await page.evaluate(() => { const d = document.querySelector('dialog.archive-viewer'); const v = d.querySelector('video[controls], iframe'); return v ? { tag: v.tagName, src: (v.src || '').slice(0, 60) } : null; });
  const v = page.locator('dialog.archive-viewer video[controls], dialog.archive-viewer iframe').first();
  if (await v.count()) { const bb = await v.boundingBox(); await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 4 }); await page.waitForTimeout(250); res.cursorOverPlayer = await cur(); await shot(page, 'archive-viewer-player-cursor', { clip: { x: bb.x + bb.width / 2 - 80, y: bb.y + bb.height / 2 - 60, width: 160, height: 120 } }); }
  await page.locator('.archive-close').click(); await page.waitForTimeout(500);
  res.afterCloseClick = await page.evaluate(() => ({ open: document.querySelector('dialog.archive-viewer').open, focus: document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName }));
}
res.log = log;
writeFileSync(new URL('./archive.json', import.meta.url), JSON.stringify(res, null, 2));
console.log(JSON.stringify(res, null, 2));
await b.close();
