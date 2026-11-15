// Round 3b re-judge: targeted checks of the claimed fixes, at 390/768/1440 x motion full/calm/reduced.
import { chromium, guard, go, save, shots, sharp, rgb, hue, toHex } from './lib.mjs';
const b = await chromium.launch(); const R = { mech: [], dead: [], save: {}, arrive: {}, openLinks: [], forced: {}, root: {}, headings: {} };
const setMotion = (p, m) => p.evaluate(m => document.querySelectorAll('.site-theme').forEach(e => { e.dataset.motion = m; }), m);
async function ctxFor(w, motion, extra = {}) {
  const h = w < 768 ? 844 : w < 1000 ? 1024 : 900;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: 'dark', reducedMotion: motion === 'reduced' ? 'reduce' : 'no-preference', hasTouch: w < 768, isMobile: w < 768, ...extra });
  await guard(ctx); return ctx;
}
// 1. /mechanics G1 size + dead slots, every width x motion
for (const w of [390, 768, 1440]) for (const motion of ['full', 'calm', 'reduced']) {
  const ctx = await ctxFor(w, motion); const p = await ctx.newPage(); await go(p, '/mechanics', 1500);
  if (motion === 'calm') await setMotion(p, 'calm');
  const g1 = p.locator('a[href*="8oZCxzC"]').first();
  await g1.scrollIntoViewIfNeeded(); await p.waitForTimeout(2500);
  const box = await g1.boundingBox();
  const col = await p.evaluate(() => document.querySelector('main h1').getBoundingClientRect().width);
  const v = await p.evaluate(() => { const v = document.querySelector('a[href*="8oZCxzC"] video') || [...document.querySelectorAll('video')].find(x => /af02a3f3/.test(x.currentSrc)); return v ? { paused: v.paused, ready: v.readyState } : null; });
  if (w === 390 || w === 1440) await p.screenshot({ path: `${shots}r2-g1-${w}-${motion}.png` });
  R.mech.push({ w, motion, g1: box && [Math.round(box.width), Math.round(box.height)], column: Math.round(col), video: v });
  // dead slot (3hhNUKR) under this motion: initial state, then press play
  const dead = p.locator('a[href*="3hhNUKR"]').first(); await dead.scrollIntoViewIfNeeded(); await p.waitForTimeout(1200);
  const fig = dead.locator('xpath=ancestor::figure[1]');
  const host = (await fig.count()) ? fig : dead.locator('xpath=..');
  const before = await host.evaluate(e => ({ text: e.innerText.trim().replace(/\s+/g, ' ').slice(0, 80), buttons: [...e.querySelectorAll('button')].map(x => x.getAttribute('aria-label') || x.textContent.trim()), links: [...e.querySelectorAll('a')].filter(a => a.textContent.trim()).map(a => ({ t: a.textContent.trim(), c: getComputedStyle(a).color })) }));
  let after = null;
  const play = host.locator('button').first();
  if (await play.count()) { await play.click(); await p.waitForTimeout(3500); after = await host.evaluate(e => ({ text: e.innerText.trim().replace(/\s+/g, ' ').slice(0, 80), buttons: [...e.querySelectorAll('button')].map(x => x.getAttribute('aria-label') || x.textContent.trim()), links: [...e.querySelectorAll('a')].filter(a => a.textContent.trim()).map(a => ({ t: a.textContent.trim(), c: getComputedStyle(a).color })) })); }
  const hb = await host.boundingBox(); if (w === 390) await p.screenshot({ path: `${shots}r2-dead-${w}-${motion}.png`, clip: { x: 0, y: Math.max(0, hb.y - 20), width: w, height: Math.min(hb.height + 40, 400) } });
  R.dead.push({ w, motion, before, after });
  // heading colours vs original direction
  if (motion === 'full') R.headings[`mechanics@${w}`] = await p.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3')].map(h => [h.tagName, h.className.toString().slice(0, 24), h.textContent.trim().slice(0, 24), getComputedStyle(h).color, getComputedStyle(h).fontSize]));
  await ctx.close();
}
// heading colours on contact, blog, bio
{
  const ctx = await ctxFor(1440, 'full');
  for (const path of ['/contact-waambat', '/blog-press', '/bio-waambat', '/ordinals']) { const p = await ctx.newPage(); await go(p, path, 1500); R.headings[path] = await p.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3')].slice(0, 12).map(h => [h.tagName, h.className.toString().slice(0, 24), h.textContent.trim().slice(0, 30), getComputedStyle(h).color, getComputedStyle(h).fontSize])); await p.close(); }
  await ctx.close();
}
// 2. Save dialog
for (const motion of ['full', 'reduced']) {
  const ctx = await ctxFor(1440, motion); const p = await ctx.newPage(); await go(p, '/ordinals', 2500);
  const art = p.locator('main video, main img').first(); await art.scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
  const bb = await art.boundingBox(); await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2, { button: 'right' }); await p.waitForTimeout(1500);
  const d = p.locator('dialog[open]').first();
  if (!(await d.count())) { R.save[motion] = 'no dialog'; await ctx.close(); continue; }
  const info = await p.evaluate(() => { const d = document.querySelector('dialog[open]'); const all = [...d.querySelectorAll('*')].filter(e => e.childElementCount === 0 && e.textContent.trim()).map(e => ({ t: e.textContent.trim().slice(0, 30), c: getComputedStyle(e).color })); return { backdrop: getComputedStyle(d, '::backdrop').backdropFilter, texts: all, buttons: [...d.querySelectorAll('button')].map(x => ({ t: (x.getAttribute('aria-label') || x.textContent).trim().slice(0, 25), c: getComputedStyle(x).color, border: getComputedStyle(x).borderColor })) }; });
  const back = d.locator('button', { hasText: /back to the artwork/i }).first();
  if (await back.count()) {
    const k = await back.boundingBox(); await p.mouse.move(k.x + k.width / 2, k.y + k.height / 2); await p.waitForTimeout(300);
    info.backHover = await back.evaluate(e => getComputedStyle(e).color);
    await p.screenshot({ path: `${shots}r2-save-${motion}.png` });
    await back.click(); await p.waitForTimeout(600); info.closedByBack = (await p.locator('dialog[open]').count()) === 0;
  }
  R.save[motion] = info; await ctx.close();
}
// 3. Arrival: page title + hero wordmark, frozen at several times; record shadow colours
{
  const ctx = await ctxFor(1440, 'full'); const p = await ctx.newPage();
  await go(p, '/contact-waambat', 0); await p.waitForSelector('main h1');
  const names = await p.evaluate(() => [...new Set(document.getAnimations().map(a => a.animationName).filter(Boolean))]);
  const frames = [];
  for (const t of [0, 110, 220, 330]) {
    await p.evaluate(t => { for (const a of document.getAnimations()) if (/arrive/.test(a.animationName || '')) { a.pause(); a.currentTime = t; } }, t);
    await p.waitForTimeout(60);
    frames.push({ t, shadow: await p.evaluate(() => getComputedStyle(document.querySelector('main h1')).textShadow) });
    if (t === 110) { const h = await p.locator('main h1').boundingBox(); await p.screenshot({ path: `${shots}r2-title-arrive-110.png`, clip: { x: h.x - 6, y: h.y - 4, width: 320, height: h.height + 8 } }); }
  }
  R.arrive.title = { names, frames };
  await p.close();
  const h = await ctx.newPage(); await go(h, '/', 0); await h.waitForSelector('[data-hero-wordmark]');
  const hn = await h.evaluate(() => document.getAnimations().map(a => ({ n: a.animationName, el: a.effect?.target?.className?.toString().slice(0, 30) })).filter(a => a.n));
  const hf = [];
  for (const t of [0, 150, 300]) {
    await h.evaluate(t => { for (const a of document.getAnimations()) if (a.timeline instanceof DocumentTimeline && a.animationName && !/cursor|shimmer/.test(a.animationName)) { a.pause(); a.currentTime = t; } }, t);
    await h.waitForTimeout(60);
    hf.push({ t, ...(await h.evaluate(() => { const e = document.querySelector('[data-hero-wordmark]'); const els = [e, ...e.querySelectorAll('*')]; return { shadows: els.map(x => getComputedStyle(x).textShadow).filter(s => s !== 'none').slice(0, 2), filters: els.map(x => getComputedStyle(x).filter).filter(s => s !== 'none').slice(0, 2) }; })) });
    if (t === 150) { const bb = await h.locator('[data-hero-wordmark]').boundingBox(); await h.screenshot({ path: `${shots}r2-hero-arrive-150.png`, clip: { x: Math.max(0, bb.x - 10), y: Math.max(0, bb.y - 10), width: Math.min(bb.width + 20, 700), height: Math.min(bb.height + 20, 300) } }); }
  }
  R.arrive.hero = { anims: hn.slice(0, 8), frames: hf };
  await ctx.close();
}
// 4. "Open original" link colours: mechanics (full) + archive viewer tiles
{
  const ctx = await ctxFor(1440, 'full'); const p = await ctx.newPage(); await go(p, '/art-by-waambat', 2500);
  await p.evaluate(() => scrollTo(0, 900)); await p.waitForTimeout(3000);
  R.openLinks = await p.evaluate(() => [...document.querySelectorAll('main a')].filter(a => /open original/i.test(a.textContent)).slice(0, 4).map(a => ({ t: a.textContent.trim(), c: getComputedStyle(a).color, path: location.pathname })));
  await p.close(); await ctx.close();
}
// 5. Forced colours menu current page
{
  const ctx = await ctxFor(390, 'full', { forcedColors: 'active' }); const p = await ctx.newPage(); await go(p, '/bio-waambat', 1500);
  await p.locator('header button[aria-label="Menu"]').tap(); await p.waitForTimeout(1000);
  await p.screenshot({ path: `${shots}r2-forced-menu.png` });
  R.forced.menu = await p.evaluate(() => [...document.querySelectorAll('#mobile-site-menu nav a')].map(a => ({ t: a.textContent.trim(), cur: a.getAttribute('aria-current'), deco: getComputedStyle(a).textDecorationLine, after: getComputedStyle(a, '::after').opacity + ' ' + getComputedStyle(a, '::after').backgroundColor + ' ' + getComputedStyle(a, '::after').borderBottom })));
  await ctx.close();
  const c2 = await ctxFor(1440, 'full', { forcedColors: 'active' }); const q = await c2.newPage(); await go(q, '/bio-waambat', 1500);
  await q.screenshot({ path: `${shots}r2-forced-desktop-nav.png`, clip: { x: 0, y: 0, width: 1440, height: 150 } }); await c2.close();
}
// 6. Theme on :root
{
  const ctx = await ctxFor(1440, 'full'); const p = await ctx.newPage(); await go(p, '/contact-waambat', 1500);
  R.root = await p.evaluate(() => { const s = getComputedStyle(document.documentElement); return { accentColor: s.accentColor, scrollbarColor: s.scrollbarColor, uiAccent: s.getPropertyValue('--ui-accent').trim(), uiHover: s.getPropertyValue('--ui-accent-hover').trim(), navHover: s.getPropertyValue('--ui-accent-nav-hover').trim(), cursor: s.getPropertyValue('--ui-cursor').trim(), inlineStyleVars: (document.documentElement.getAttribute('style') || '').split(';').filter(Boolean).length, wrappers: document.querySelectorAll('.site-theme').length }; });
  await ctx.close();
}
save('r2.json', R);
console.log('MECH', JSON.stringify(R.mech));
for (const d of R.dead) console.log('DEAD', d.w, d.motion, JSON.stringify(d.before), '=>', JSON.stringify(d.after));
console.log('SAVE', JSON.stringify(R.save));
console.log('ARRIVE', JSON.stringify(R.arrive));
console.log('OPEN', JSON.stringify(R.openLinks)); console.log('FORCED', JSON.stringify(R.forced)); console.log('ROOT', JSON.stringify(R.root));
console.log('HEAD', JSON.stringify(R.headings));
await b.close();
