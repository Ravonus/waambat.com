// Compare local /mechanics with https://waambat.com/mechanics: block order, media geometry, text.
import { chromium, guard, base, save, shots, sharp } from './lib.mjs';
const b = await chromium.launch(); const R = {};
async function grab(url, label, width) {
  const ctx = await b.newContext({ viewport: { width, height: 950 }, colorScheme: 'dark', reducedMotion: 'reduce' });
  if (url.startsWith(base)) await guard(ctx);
  else await ctx.route('**/*', r => (r.request().method() === 'GET' ? r.fallback() : r.abort()));
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(4000);
  // scroll through to trigger lazy loading
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 700) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(250); }
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1500);
  const blocks = await p.evaluate(() => {
    const out = []; const seen = new Set();
    const els = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,img,video,iframe,picture')];
    for (const e of els) {
      if (e.closest('header,nav,footer')) continue;
      const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
      if (e.tagName === 'IMG' && e.closest('picture') && seen.has(e.closest('picture'))) continue;
      if (e.tagName === 'PICTURE') seen.add(e);
      const isMedia = /IMG|VIDEO|IFRAME|PICTURE/.test(e.tagName);
      if (!isMedia && [...e.children].some(c => /^(P|H\d|LI)$/.test(c.tagName))) continue;
      out.push({ tag: e.tagName, text: isMedia ? '' : e.textContent.trim().replace(/\s+/g, ' ').slice(0, 50), src: isMedia ? (e.currentSrc || e.src || e.querySelector?.('img')?.currentSrc || '').split('/').pop().slice(0, 50) : undefined, x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height), color: isMedia ? undefined : getComputedStyle(e).color, fs: isMedia ? undefined : getComputedStyle(e).fontSize });
    }
    return { blocks: out.filter(b => b.tag !== 'P' || b.text), H: document.documentElement.scrollHeight };
  });
  await p.screenshot({ path: `${shots}mech-${label}-${width}.png`, fullPage: true });
  await ctx.close();
  return blocks;
}
for (const w of [1512, 390]) {
  R['orig' + w] = await grab('https://waambat.com/mechanics', 'orig', w);
  R['local' + w] = await grab(base + '/mechanics', 'local', w);
}
save('mechanics.json', R);
for (const w of [1512, 390]) for (const k of ['orig', 'local']) { const d = R[k + w]; console.log(`--- ${k}${w} H=${d.H}`); for (const x of d.blocks) console.log(x.tag.padEnd(7), String(x.x).padStart(4), String(x.y).padStart(5), `${x.w}x${x.h}`.padEnd(10), x.text || x.src, x.color || ''); }
await b.close();
