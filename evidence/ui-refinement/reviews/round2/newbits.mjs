// New in the late revision: rail scroll glitch, wordmark hover. Full vs reduced vs calm.
import { chromium, base, shots, save, settle, sharp } from './lib.mjs';
const b = await chromium.launch(); const R = {};
for (const [label, opts, motion] of [['full', {}, null], ['reduce', { reducedMotion: 'reduce' }, null], ['calm', {}, 'calm']]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, ...opts }); const p = await ctx.newPage();
  await p.goto(base + '/'); await settle(p, 2000);
  if (motion) await p.evaluate(m => document.querySelector('.site-theme').dataset.motion = m, motion);
  await p.mouse.move(700, 450);
  // fast wheel, sample canvas columns painted mid-scroll
  const samples = [];
  for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 400); await p.waitForTimeout(30); samples.push(await p.evaluate(() => { const cv = document.querySelector('.waambat-scroll-rail canvas'); const c = cv.getContext('2d'); const d = c.getImageData(0, 0, cv.width, cv.height).data; const cols = new Set(); let deep = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 30) { cols.add((i / 4) % cv.width); if (d[i] < 235 && d[i + 1] < 130) deep++; } return { cols: cols.size, deepPx: deep }; })); }
  R[label] = { railMidScroll: samples };
  const z = await p.screenshot({ clip: { x: 1410, y: 0, width: 30, height: 300 } }); await sharp(z).resize(120, 1200, { kernel: 'nearest' }).toFile(shots + `new-rail-scroll-${label}.png`);
  await p.waitForTimeout(700);
  R[label].railSettled = await p.evaluate(() => { const cv = document.querySelector('.waambat-scroll-rail canvas'); const c = cv.getContext('2d'); const d = c.getImageData(0, 0, cv.width, cv.height).data; const cols = new Set(); for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 30) cols.add((i / 4) % cv.width); return cols.size; });
  // wordmark hover (header, after scrolling back to a page with the header logo)
  await p.goto(base + '/contact-waambat'); await settle(p, 1500);
  if (motion) await p.evaluate(m => document.querySelector('.site-theme').dataset.motion = m, motion);
  const l = p.locator('a.site-logo'); const bb = await l.boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(500);
  R[label].wordmarkHover = await l.evaluate(e => { const c = getComputedStyle(e); return { color: c.color, filter: c.filter.slice(0, 160), anims: e.getAnimations().map(a => a.animationName || 'transition') }; });
  await p.screenshot({ path: shots + `new-wordmark-hover-${label}.png`, clip: { x: bb.x - 30, y: bb.y - 20, width: bb.width + 60, height: bb.height + 40 } });
  await ctx.close();
}
save('newbits.json', R); console.log(JSON.stringify(R, null, 1)); await b.close();
