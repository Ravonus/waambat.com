// Custom cursor: colours, keyline, visibility over pink titles / filled controls / light art, shapes, fallback, press split.
import { chromium, base, shots, save, settle, cr, sharp } from './lib.mjs';
const b = await chromium.launch();
const R = { blocked: [] };
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' });
// Hold (never fulfil) contact POSTs so the pending state can be seen; abort original GETs; everything else passes.
const held = [];
await ctx.route('**/*', route => { const r = route.request(); if (r.method() === 'POST') { held.push(r.url()); return; } if (r.method() !== 'GET' && r.method() !== 'HEAD') { R.blocked.push(r.method() + ' ' + r.url()); return route.abort(); } if (r.method() === 'GET' && /media-originals/.test(r.url())) { R.blocked.push('GET ' + r.url()); return route.abort(); } return route.fallback(); });
const page = await ctx.newPage();
const cursorInfo = () => page.evaluate(() => { const c = document.querySelector('.waambat-cursor'); if (!c) return null; const s = c.querySelector('span'); const cs = getComputedStyle(s); const r = s.getBoundingClientRect(); return { state: c.dataset.cursorState, open: c.matches(':popover-open'), opacity: c.style.opacity, html: document.documentElement.dataset.waambatCursor, bg: cs.backgroundImage.slice(0, 160), filter: cs.filter, anim: cs.animationName, rect: [r.x, r.y, r.width, r.height].map(Math.round), pressed: c.hasAttribute('data-pressed') }; });
// Zoomed crop around the cursor glyph and a crop of the same spot without the cursor (popover hidden) for contrast.
async function look(name, x, y) {
  await page.mouse.move(x, y); await page.waitForTimeout(350);
  // freeze the sheen so both shots match
  await page.evaluate(() => document.querySelector('.waambat-cursor span')?.getAnimations().forEach(a => { a.pause(); a.currentTime = 0; }));
  const info = await cursorInfo();
  const clip = { x: x - 14, y: y - 14, width: 44, height: 44 };
  const withC = await page.screenshot({ clip }); await sharp(withC).resize(176, 176, { kernel: 'nearest' }).toFile(shots + `cursor-${name}.png`);
  await page.evaluate(() => { const c = document.querySelector('.waambat-cursor'); c.style.visibility = 'hidden'; });
  const without = await page.screenshot({ clip });
  await page.evaluate(() => { const c = document.querySelector('.waambat-cursor'); c.style.visibility = ''; document.querySelector('.waambat-cursor span')?.getAnimations().forEach(a => a.play()); });
  // background colour = median of the crop without cursor; cursor ink = pixels that changed
  const A = await sharp(withC).raw().toBuffer({ resolveWithObject: true }), B = await sharp(without).raw().toBuffer({ resolveWithObject: true });
  const ch = A.info.channels; const bgs = [], ink = [];
  for (let i = 0; i < A.data.length; i += ch) { const a = [A.data[i], A.data[i + 1], A.data[i + 2]], o = [B.data[i], B.data[i + 1], B.data[i + 2]]; const d = Math.abs(a[0] - o[0]) + Math.abs(a[1] - o[1]) + Math.abs(a[2] - o[2]); if (d > 30) { ink.push({ a, o }); } else bgs.push(o); }
  // keyline: share of changed pixels that are near-black, and contrast of pink ink vs what was beneath it
  const pink = ink.filter(p => p.a[0] > 150); const dark = ink.filter(p => p.a[0] + p.a[1] + p.a[2] < 90);
  const ratios = pink.map(p => cr(p.a, p.o)).sort((m, n) => m - n);
  const keyRatios = dark.map(p => cr(p.a, p.o)).sort((m, n) => m - n);
  return { info, changedPx: ink.length, pinkPx: pink.length, keylinePx: dark.length, pinkVsUnderMedian: ratios.length ? +ratios[Math.floor(ratios.length / 2)].toFixed(2) : null, pinkVsUnderMin: ratios.length ? +ratios[0].toFixed(2) : null, keylineVsUnderMedian: keyRatios.length ? +keyRatios[Math.floor(keyRatios.length / 2)].toFixed(2) : null, underSample: bgs.length ? bgs[Math.floor(bgs.length / 2)] : null };
}
// 1. Titles
await page.goto(base + '/mechanics'); await settle(page, 1500);
let h = await page.locator('main h1, main h2').first().boundingBox();
R.overTitle = await look('over-title', h.x + 60, h.y + h.height / 2);
R.overBodyHeadingText = await look('over-pink-copy', h.x + 120, h.y + h.height + 30);
// press split
await page.mouse.move(h.x + 60, h.y + h.height / 2); await page.waitForTimeout(300);
await page.mouse.down(); await page.waitForTimeout(50);
R.press = await cursorInfo();
await page.screenshot({ path: shots + 'cursor-press-split.png', clip: { x: h.x + 40, y: h.y + h.height / 2 - 20, width: 60, height: 50 } });
await page.waitForTimeout(400); R.pressAfter400 = await cursorInfo(); await page.mouse.up();
// shapes
R.shapes = {};
for (const [k, sel] of [['link', 'header nav a'], ['body', 'main p'], ['logo', 'a.site-logo'], ['media', '.media-control'], ['rail', '.waambat-scroll-rail']]) {
  const l = page.locator(sel).first(); if (!(await l.count())) continue; const bb = await l.boundingBox(); if (!bb) continue;
  await page.mouse.move(bb.x + bb.width / 2, bb.y + Math.min(bb.height / 2, 30)); await page.waitForTimeout(250);
  R.shapes[k] = (await cursorInfo())?.state;
}
// iframe (native pointer) on /instagram or /ordinals
await page.goto(base + '/ordinals'); await settle(page, 2500);
const fr = page.locator('iframe').first();
if (await fr.count()) { await fr.scrollIntoViewIfNeeded(); await page.waitForTimeout(500); const bb = await fr.boundingBox(); await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.waitForTimeout(300); R.shapes.iframe = await cursorInfo(); }
// 2. Contact: submit (rest under keyboard, hover, pending), field
await page.goto(base + '/contact-waambat'); await settle(page, 1500);
await page.locator('main h1, main h2').first().scrollIntoViewIfNeeded(); await page.waitForTimeout(400); const title = await page.locator('main h1, main h2').first().boundingBox();
R.overContactTitle = await look('over-contact-title', title.x + 40, title.y + title.height / 2);
await page.locator('main button[type=submit]').scrollIntoViewIfNeeded(); await page.waitForTimeout(400); const sb = await page.locator('main button[type=submit]').boundingBox();
R.overSubmitHover = await look('over-submit-hover', sb.x + 30, sb.y + sb.height / 2);
// fill required fields and submit; POST is held so the button stays pending
const inputs = page.locator('main input:not([type=hidden]), main textarea');
const n = await inputs.count();
for (let i = 0; i < n; i++) { const t = await inputs.nth(i).getAttribute('type'); await inputs.nth(i).fill(t === 'email' ? 'critic@example.test' : 'Critic test - not sent'); }
await page.locator('main button[type=submit]').click(); await page.waitForTimeout(300);
R.pendingButton = await page.evaluate(() => { const s = document.querySelector('main button[type=submit]'); const c = getComputedStyle(s); return { text: s.textContent.trim(), bg: c.backgroundColor, color: c.color, disabled: s.disabled || !!s.closest('fieldset:disabled') }; });
R.overSubmitPending = await look('over-submit-pending', sb.x + 30, sb.y + sb.height / 2);
R.heldPosts = held.length;
// 3. Save dialog: right-click an artwork; originals GET aborted, HEAD allowed
await page.goto(base + '/art-by-waambat'); await settle(page, 2500);
const img = page.locator('main img').first(); await img.scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
const ib = await img.boundingBox();
await page.mouse.click(ib.x + ib.width / 2, ib.y + ib.height / 2, { button: 'right' }); await page.waitForTimeout(3000);
R.saveDialog = await page.evaluate(() => { const d = document.querySelector('dialog.waambat-download'); return d && { open: d.open, text: d.innerText.replace(/\s+/g, ' ').slice(0, 160), save: !!d.querySelector('.waambat-download-save') }; });
if (await page.locator('.waambat-download-save').count()) {
  const s = await page.locator('.waambat-download-save').boundingBox();
  R.overSave = await look('over-save', s.x + 30, s.y + s.height / 2);
  await page.screenshot({ path: shots + 'cursor-save-dialog.png' });
  await page.locator('.waambat-download-cancel').click(); await page.waitForTimeout(400);
} else { await page.screenshot({ path: shots + 'cursor-save-dialog.png' }); await page.keyboard.press('Escape'); }
// 4. Light artwork: find the brightest 40px patch among visible images on /art-by-waambat and /
for (const path of ['/art-by-waambat', '/blog-press']) {
  await page.goto(base + path); await settle(page, 2500);
  const shot = await page.screenshot(); const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
  let best = { v: 0 }; const W = info.width, H = info.height, c = info.channels;
  for (let y = 200; y < H - 100; y += 40) for (let x = 100; x < W - 140; x += 40) { let s = 0; for (let dy = 0; dy < 40; dy += 4) for (let dx = 0; dx < 40; dx += 4) { const i = ((y + dy) * W + x + dx) * c; s += data[i] + data[i + 1] + data[i + 2]; } if (s > best.v) best = { v: s, x, y }; }
  const avg = best.v / 100 / 3;
  if (avg > 170) { R['overLightArt_' + path] = { avg: Math.round(avg), ...(await look('over-light-art' + path.replace(/\//g, '-'), best.x / 2 + 10, best.y / 2 + 10)) }; break; }
}
// 5. Native fallback: close the popover and check the native cursor is restored
await page.goto(base + '/contact-waambat'); await settle(page, 1500);
const nb = await page.locator('header nav a').first().boundingBox(); await page.mouse.move(nb.x + 10, nb.y + 8); await page.waitForTimeout(300);
R.fallback = { before: await page.evaluate(() => getComputedStyle(document.querySelector('header nav a')).cursor) };
await page.evaluate(() => document.querySelector('.waambat-cursor').hidePopover());
R.fallback.afterHide = await page.evaluate(() => getComputedStyle(document.querySelector('header nav a')).cursor);
await ctx.close();
// touch / coarse: custom cursor never shows
const t = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const tp = await t.newPage();
await tp.goto(base + '/contact-waambat'); await settle(tp, 1200); await tp.locator('header button[aria-label="Menu"]').tap(); await tp.waitForTimeout(500);
R.touch = await tp.evaluate(() => { const c = document.querySelector('.waambat-cursor'); return { exists: !!c, open: c?.matches(':popover-open'), display: c && getComputedStyle(c).display, html: document.documentElement.dataset.waambatCursor ?? null, linkCursor: getComputedStyle(document.querySelector('a')).cursor }; });
await t.close();
save('cursor.json', R);
console.log(JSON.stringify(R, null, 1));
await b.close();
