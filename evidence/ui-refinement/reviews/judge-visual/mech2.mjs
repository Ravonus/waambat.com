import { chromium, guard, go, save, shots } from './lib.mjs';
const b = await chromium.launch(); const R = {};
for (const motion of ['no-preference', 'reduce']) {
  const ctx = await b.newContext({ viewport: { width: 1512, height: 950 }, colorScheme: 'dark', reducedMotion: motion }); await guard(ctx);
  const p = await ctx.newPage(); await go(p, '/mechanics', 2000);
  for (const y of [300, 1900, 2250]) {
    await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(3000);
    R[motion + y] = await p.evaluate(() => [...document.querySelectorAll('main figure, main picture, main video, main [class*=unavailable], main a[href*=imgur]')].filter(e => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }).map(e => { const r = e.getBoundingClientRect(); return { tag: e.tagName, cls: String(e.className).slice(0, 50), text: e.textContent.trim().slice(0, 60), box: [r.x, r.y, r.width, r.height].map(Math.round), src: (e.currentSrc || e.getAttribute?.('href') || '').slice(-50), paused: e.paused, vw: e.videoWidth, vh: e.videoHeight, attrs: e.tagName === 'VIDEO' ? [e.getAttribute('width'), e.getAttribute('height'), getComputedStyle(e).objectFit, getComputedStyle(e).aspectRatio] : undefined }; }));
    await p.screenshot({ path: `${shots}mech2-${motion}-${y}.png` });
  }
  await ctx.close();
}
save('mech2.json', R); console.log(JSON.stringify(R, null, 0));
await b.close();
