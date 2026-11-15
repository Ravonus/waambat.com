import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const out = new URL('./', import.meta.url).pathname;
const b = await chromium.launch();
const errors = [];
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  p.on('pageerror', e => errors.push(e.message));
  await p.goto('http://localhost:3287/art-by-waambat', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const tile = p.locator('.archive-tile').first(); await tile.hover();
  await tile.locator('.archive-expand').click(); await p.waitForTimeout(3500);
  const rows = [];
  for (let i = 0; i < 25; i++) {
    rows.push(await p.evaluate(() => { const m = document.querySelector('.archive-viewer-media'); if (!m) return null; const r = m.getBoundingClientRect(); const media = m.querySelector('iframe,video,img'); const mr = media?.getBoundingClientRect();
      return { r: +getComputedStyle(m).getPropertyValue('--viewer-ratio'), box: [Math.round(r.width), Math.round(r.height)], fits: r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, media: media?.tagName, mbox: mr && [Math.round(mr.width), Math.round(mr.height)], clipped: !!mr && (mr.width > r.width + 1 || mr.height > r.height + 1), unavailable: !!m.querySelector('.inline-video-unavailable'), src: (m.querySelector('iframe')?.src || '').slice(0, 50) }; }));
    if (i < 3) await p.screenshot({ path: out + `viewer-${w}-${i}.png` });
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(i < 3 ? 3000 : 600);
  }
  console.log(w, 'clipped', rows.filter(r => r?.clipped).length, 'overflow', rows.filter(r => r && !r.fits).length, 'shapes', [...new Set(rows.map(r => r?.box.join('x')))].join(' '));
  console.log(' first3', JSON.stringify(rows.slice(0, 3)));
}
console.log('errors', errors);
await b.close();
