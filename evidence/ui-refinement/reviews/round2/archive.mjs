// Archive fullscreen viewer: frame fits width and height, takes each item's ratio, reshapes on next/prev; Vimeo fallback.
import { chromium, base, shots, save, guard, settle } from './lib.mjs';
const b = await chromium.launch(); const R = {};
for (const [label, opts] of [['390', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }], ['844land', { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }], ['1440', { viewport: { width: 1440, height: 900 } }]]) {
  const ctx = await b.newContext({ ...opts, colorScheme: 'dark' }); await guard(ctx);
  const p = await ctx.newPage(); await p.goto(base + '/art-by-waambat'); await settle(p, 2500);
  const exp = p.locator('.archive-expand').first();
  if (!(await exp.count())) { R[label] = 'no expand control'; await ctx.close(); continue; }
  await exp.scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
  if (opts.hasTouch) await exp.tap(); else await exp.click();
  await p.waitForTimeout(1500);
  const items = [];
  for (let i = 0; i < 8; i++) {
    const s = await p.evaluate(() => {
      const m = document.querySelector('.archive-viewer-media'); if (!m) return null; const r = m.getBoundingClientRect(); const c = getComputedStyle(m);
      const content = m.textContent.replace(/\s+/g, ' ').trim().slice(0, 80);
      const media = m.querySelector('iframe, img, video'); const mr = media?.getBoundingClientRect();
      return { rect: [r.x, r.y, r.width, r.height].map(v => Math.round(v)), ratioStyle: c.aspectRatio, measuredRatio: +(r.width / r.height).toFixed(3), fitsW: r.left >= -1 && r.right <= innerWidth + 1, fitsH: r.top >= -1 && r.bottom <= innerHeight + 1, kind: media?.tagName, mediaRect: mr && [mr.width, mr.height].map(Math.round), unavailable: /unavailable/i.test(content), text: content, title: document.querySelector('.archive-viewer-content')?.innerText.replace(/\s+/g, ' ').slice(0, 60) };
    });
    items.push(s);
    if (i < 3) await p.screenshot({ path: shots + `archive-${label}-${i}.png` });
    const next = p.locator('.archive-viewer-content button', { hasText: /next/i });
    if (!(await next.count())) { await p.keyboard.press('ArrowRight'); } else if (opts.hasTouch) await next.tap(); else await next.click();
    await p.waitForTimeout(1200);
  }
  R[label] = items;
  await ctx.close();
}
save('archive.json', R);
for (const [k, v] of Object.entries(R)) { console.log('==', k); if (Array.isArray(v)) for (const s of v) console.log(JSON.stringify(s && [s.rect, s.ratioStyle, s.measuredRatio, s.fitsW, s.fitsH, s.kind, s.unavailable, s.text.slice(0, 50)])); else console.log(v); }
await b.close();
