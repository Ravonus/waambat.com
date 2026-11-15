// Archive tiles at the baseline "scrolled" position: full vs reduced motion, to see whether stills/captions are readable.
import { chromium, guard, go, save, shots } from './lib.mjs';
const b = await chromium.launch(); const R = {};
for (const motion of ['no-preference', 'reduce']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', reducedMotion: motion }); await guard(ctx);
  const p = await ctx.newPage(); await go(p, '/art-by-waambat', 2500);
  await p.evaluate(() => scrollTo(0, 900)); await p.waitForTimeout(5000);
  await p.screenshot({ path: `${shots}archive-${motion}-900.png` });
  R[motion] = await p.evaluate(() => [...document.querySelectorAll('.archive-tile, [class*=archive] figure, main a')].filter(e => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && r.width > 200; }).slice(0, 8).map(e => { const r = e.getBoundingClientRect(); const img = e.querySelector('img'), v = e.querySelector('video'); return { cls: String(e.className).slice(0, 40), box: [r.x, r.y, r.width, r.height].map(Math.round), img: img ? { src: (img.currentSrc || '').slice(-50), ok: img.complete && img.naturalWidth > 0 } : null, video: v ? { paused: v.paused, ready: v.readyState } : null, caption: e.textContent.trim().slice(0, 40) }; }));
  await ctx.close();
}
save('archive.json', R); console.log(JSON.stringify(R));
await b.close();
