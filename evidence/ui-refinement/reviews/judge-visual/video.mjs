// Viewport playback: step-scroll home and the archive; at each step every video >=60% visible should play, fully off-screen should be paused.
import { chromium, guard, go, save } from './lib.mjs';
const b = await chromium.launch(); const R = {};
const snap0 = p => p.evaluate(() => [...document.querySelectorAll('video')].map((v, i) => {
  const r = v.getBoundingClientRect(); const vis = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) * Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)) / Math.max(1, r.width * r.height);
  return { i, vis: +vis.toFixed(2), paused: v.paused, ready: v.readyState, t: +v.currentTime.toFixed(2), err: !!v.error, user: v.dataset.userPaused || v.closest('[data-user-paused]') ? 1 : 0, src: (v.currentSrc || '').slice(-30) };
}));
let reloads = 0;
const snap = async p => { for (let k = 0; k < 3; k++) { try { return await snap0(p); } catch (e) { reloads++; console.log('reload/nav during probe', String(e).slice(0, 80)); await p.waitForLoadState('load').catch(() => {}); await p.waitForTimeout(1500); } } return []; };
async function sweep(label, opts, path, viaMenu = false) {
  const ctx = await b.newContext({ colorScheme: 'dark', ...opts }); await guard(ctx);
  const p = await ctx.newPage();
  if (viaMenu) { await go(p, '/bio-waambat', 1500); await p.locator('header button[aria-label="Menu"]').tap(); await p.waitForTimeout(800); await p.locator('#mobile-site-menu nav a', { hasText: 'NFTs' }).tap(); await p.waitForTimeout(2500); }
  else await go(p, path, 2500);
  const H = await p.evaluate(() => document.documentElement.scrollHeight), vh = opts.viewport.height;
  const steps = []; const bad = [];
  for (let y = 0, k = 0; y < H - vh && k < 60; y += Math.round(vh * 0.55), k++) {
    await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(1600);
    const s = await snap(p);
    for (const v of s) {
      if (v.vis >= 0.6 && v.paused && !v.err && !v.user) bad.push({ y, kind: 'visible-but-paused', ...v });
      if (v.vis === 0 && !v.paused) bad.push({ y, kind: 'offscreen-but-playing', ...v });
    }
    steps.push({ y, playing: s.filter(v => !v.paused).length, visible: s.filter(v => v.vis >= 0.6).length });
  }
  // back to top quickly then check first video resumes
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1800);
  const top = await snap(p);
  R[label] = { videos: (await snap(p)).length, steps: steps.length, bad, topAfterReturn: top.filter(v => v.vis >= 0.6).map(v => ({ i: v.i, paused: v.paused, t: v.t })) };
  console.log(label, 'videos', R[label].videos, 'steps', steps.length, 'bad', bad.length, JSON.stringify(bad.slice(0, 6)), 'top', JSON.stringify(R[label].topAfterReturn));
  await ctx.close();
}
await sweep('home-1440', { viewport: { width: 1440, height: 900 } }, '/');
await sweep('home-390', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, '/');
await sweep('home-390-via-menu', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, '/', true);
await sweep('archive-1440', { viewport: { width: 1440, height: 900 } }, '/art-by-waambat');
await sweep('mechanics-768', { viewport: { width: 768, height: 1024 } }, '/mechanics');
R.reloads = reloads; save(process.env.SUFFIX ? 'video'+process.env.SUFFIX+'.json' : 'video.json', R); console.log('reloads', reloads);
await b.close();
