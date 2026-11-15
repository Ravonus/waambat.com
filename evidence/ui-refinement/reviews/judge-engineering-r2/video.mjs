// Engineering judge: still-ready gate and playback across a scroll, plus broken-image and Vimeo fallback checks.
// Run: node video.mjs -> video.json (read-only; non-GET requests and /media-originals/ are aborted).
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const base = 'http://localhost:3287';
const out = { console: [] };
const browser = await chromium.launch();
const newPage = async (opts) => {
  const ctx = await browser.newContext(opts);
  await ctx.route('**/*', (r) => {
    const q = r.request();
    if (q.method() !== 'GET' || q.url().includes('/media-originals/')) return r.abort();
    return r.continue();
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => out.console.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') out.console.push(m.text().slice(0, 160)); });
  return { ctx, page };
};
const sample = (page) => page.evaluate(() => {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const w = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
    const h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
    return r.width * r.height ? (w * h) / (r.width * r.height) : 0;
  };
  const tiles = [...document.querySelectorAll('.inline-video')].map((t) => {
    const v = t.querySelector('video');
    const img = t.querySelector('img[data-video-first-frame]');
    let still = 'none';
    if (img) still = img.complete ? (img.naturalWidth ? 'loaded' : 'broken') : 'pending';
    return { src: (t.dataset.saveUrl || '').split('/').pop(), provider: t.dataset.inlineProvider, state: t.dataset.playbackState,
      vis: +vis(t).toFixed(2), video: !!v, paused: v ? v.paused : null, ready: v ? v.readyState : null, still };
  });
  const videos = [...document.querySelectorAll('video')].filter((v) => !v.closest('.inline-video'))
    .map((v) => ({ vis: +vis(v).toFixed(2), paused: v.paused, ready: v.readyState, src: (v.currentSrc || v.getAttribute('src') || '').split('/').pop() }));
  return { tiles, videos };
});
const runs = [
  ['home-1440', { viewport: { width: 1440, height: 900 } }, '/'],
  ['mechanics-1440', { viewport: { width: 1440, height: 900 } }, '/mechanics'],
  ['home-390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, '/'],
  ['archive-1440', { viewport: { width: 1440, height: 900 } }, '/art-by-waambat'],
  ['archive-390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, '/art-by-waambat'],
];
if (process.argv[2]) runs.splice(0, runs.length, ...runs.filter((r) => r[0].startsWith(process.argv[2])));
for (const [label, opts, path] of runs) {
  const { ctx, page } = await newPage(opts);
  await page.goto(base + path, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const details = [];
  let stuck = 0, offscreen = 0, checks = 0;
  const seen = new Set();
  for (let y = 0; y < height; y += 500) {
    await page.evaluate((y) => scrollTo(0, y), y);
    await page.waitForTimeout(1500);
    let s;
    try { s = await sample(page); } catch (e) { details.push({ y, reload: String(e.message).slice(0, 80) }); await page.waitForLoadState('load'); continue; }
    for (const t of s.tiles) {
      seen.add(t.src);
      if (t.vis >= 0.6) checks++;
      if (t.vis >= 0.6 && t.state !== 'unavailable' && (!t.video || t.paused)) { stuck++; details.push({ y, stuck: t }); }
      if (t.vis === 0 && t.video && !t.paused) { offscreen++; details.push({ y, offscreen: t }); }
    }
    for (const v of s.videos) {
      if (v.vis >= 0.6) checks++;
      if (v.vis >= 0.6 && v.paused) { stuck++; details.push({ y, stuckOther: v }); }
      if (v.vis === 0 && !v.paused) { offscreen++; details.push({ y, offscreenOther: v }); }
    }
  }
  const final = await sample(page);
  const broken = await page.evaluate(() => [...document.images]
    .filter((i) => i.getAttribute('src') === '' || i.src === location.href || (i.complete && !i.naturalWidth))
    .map((i) => ({ src: i.getAttribute('src'), alt: i.alt, cls: i.className.slice(0, 40) })));
  const stills = {};
  for (const t of final.tiles) stills[t.still] = (stills[t.still] || 0) + 1;
  out[label] = { scrollSteps: Math.ceil(height / 500), inlineTiles: final.tiles.length, tilesSeen: seen.size,
    otherVideos: final.videos.length, visibleChecks: checks, stuckWhileVisible: stuck, playingOffscreen: offscreen,
    details: details.slice(0, 12), unavailable: final.tiles.filter((t) => t.state === 'unavailable').map((t) => t.src), stills, broken };
  await ctx.close();
}
writeFileSync(new URL('./video.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1).slice(0, 8000));
await browser.close();
