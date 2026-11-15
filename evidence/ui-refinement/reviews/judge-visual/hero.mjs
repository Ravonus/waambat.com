import { chromium, guard, go, shots, save } from './lib.mjs';
const b = await chromium.launch(); const R = {};
for (const motion of ['reduce', 'no-preference']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', reducedMotion: motion }); await guard(ctx);
  const p = await ctx.newPage(); await go(p, '/', 1000);
  R[motion] = await p.evaluate(() => [...document.querySelectorAll('img, video, canvas')].filter(e => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && r.width > 0; }).map(e => { const r = e.getBoundingClientRect(); return { tag: e.tagName, cls: String(e.className).slice(0, 60), src: (e.currentSrc || e.getAttribute('src') || e.getAttribute('poster') || '').slice(-70), box: [r.x, r.y, r.width, r.height].map(Math.round), paused: e.paused, t: e.currentTime, ready: e.readyState, op: getComputedStyle(e).opacity, vis: getComputedStyle(e).visibility }; }));
  for (const t of [1000, 4000]) { await p.waitForTimeout(t === 1000 ? 0 : 3000); await p.screenshot({ path: `${shots}hero-${motion}-${t}.png` }); }
  await ctx.close();
}
save('hero.json', R); console.log(JSON.stringify(R, null, 1));
await b.close();
