import { chromium, base, shot, watchConsole, log } from './lib.mjs';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
const page = await c.newPage(); watchConsole(page, 'cursor');
const res = {};
const state = () => page.evaluate(() => { const p = document.querySelector('.waambat-cursor'); return { state: p.dataset.cursorState, opacity: p.style.opacity, open: p.matches(':popover-open'), root: document.documentElement.dataset.waambatCursor || null }; });
const at = async (x, y, name) => { await page.mouse.move(x, y, { steps: 3 }); await page.waitForTimeout(120); const s = await state(); s.el = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + '.' + (e.className?.baseVal ?? e.className).toString().slice(0, 40) : null; }, [x, y]); if (name) await shot(page, 'cursor-' + name, { clip: { x: Math.max(0, x - 60), y: Math.max(0, y - 50), width: 140, height: 110 } }); return s; };
const center = async (loc) => { const bb = await loc.boundingBox(); return [bb.x + bb.width / 2, bb.y + bb.height / 2]; };
await page.goto(base + '/contact-waambat', { waitUntil: 'load' }); await page.waitForTimeout(1500);
res.blank = await at(200, 600, 'blank');
res.navLink = await at(...await center(page.locator('header nav a').nth(1)), 'link');
const form = page.locator('section[data-contact-form]'); await form.scrollIntoViewIfNeeded(); await page.evaluate(() => scrollBy(0, 150)); await page.waitForTimeout(300);
res.input = await at(...await center(page.locator('#contact-contact-name')), 'input');
res.paragraph = await at(...await center(page.locator('section[data-contact-form] p').first()), 'text');
res.selectButton = await at(...await center(page.locator('#contact-contact-interest')), 'select-button');
res.submit = await at(...await center(page.locator('section[data-contact-form] button[type=submit]')), 'submit');
// text press holds the text cursor during drag-select
const [px, py] = await center(page.locator('section[data-contact-form] p').first());
await page.mouse.move(px - 100, py); await page.mouse.down(); await page.mouse.move(px + 60, py + 30, { steps: 6 }); await page.waitForTimeout(150);
res.textDragHeld = await state();
await shot(page, 'cursor-text-drag', { clip: { x: px - 160, y: py - 60, width: 320, height: 140 } });
await page.mouse.up();
// iframe fallback: find any iframe on site
for (const path of ['/blog-press', '/mechanics', '/instagram', '/bio-waambat', '/']) {
  await page.goto(base + path, { waitUntil: 'load' }); await page.waitForTimeout(1200);
  const ifr = page.locator('iframe'); if (await ifr.count()) { await ifr.first().scrollIntoViewIfNeeded(); await page.waitForTimeout(500); const bb = await ifr.first().boundingBox(); if (bb && bb.height > 20) { res.iframe = { path, ...(await at(bb.x + bb.width / 2, bb.y + Math.min(bb.height / 2, 200), 'iframe')) }; break; } }
}
// video[controls] fallback
for (const path of ['/mechanics', '/art-by-waambat', '/', '/bio-waambat', '/blog-press']) {
  await page.goto(base + path, { waitUntil: 'load' }); await page.waitForTimeout(1200);
  const v = page.locator('video[controls]'); if (await v.count()) { await v.first().scrollIntoViewIfNeeded(); await page.waitForTimeout(400); const bb = await v.first().boundingBox(); if (bb) { res.videoControls = { path, ...(await at(bb.x + bb.width / 2, bb.y + bb.height / 2, 'video-controls')) }; break; } }
}
// Save button camouflage: live vs injected baseline gradient
await page.goto(base + '/', { waitUntil: 'load' }); await page.waitForTimeout(2000);
const media = page.locator('main img, main video').first(); await media.scrollIntoViewIfNeeded();
const mb = await media.boundingBox();
await page.route(/media-originals/, r => r.request().method() === 'HEAD' ? r.continue() : r.abort());
await page.mouse.click(mb.x + mb.width / 2, mb.y + mb.height / 2, { button: 'right' });
await page.waitForSelector('.waambat-download-save', { timeout: 15000 });
await page.addStyleTag({ content: '.waambat-cursor span{animation:none!important;background-position:30% 30%!important}' });
const [sx, sy] = await center(page.locator('.waambat-download-save'));
res.saveHoverCursor = await at(sx - 20, sy - 2, 'save-hover-after');
await page.addStyleTag({ content: '.waambat-cursor span{background:repeating-linear-gradient(120deg,#fff0f6 0%,#ff94b2 20%,#c60064 40%,#ff70c5 60%,#fff0f6 80%)!important;background-size:240% 240%!important;background-position:30% 30%!important} .waambat-download-save:hover{background:#ffb2d1!important;color:#180c14!important}' });
await page.mouse.move(sx - 21, sy - 2); await page.waitForTimeout(150);
await shot(page, 'cursor-save-hover-baseline-sim', { clip: { x: sx - 81, y: sy - 52, width: 140, height: 110 } });
res.log = log;
writeFileSync(new URL('./cursor.json', import.meta.url), JSON.stringify(res, null, 2));
console.log(JSON.stringify(res, null, 2));
await b.close();
