// Engineering judge: the one direct (local-file) InlineVideo tile on the archive, "Everything" (Vimeo 115879626).
// Playback GETs are allowed here (a visitor's own playback request); non-GET requests stay aborted.
// Run: node direct-tile.mjs -> direct-tile.json
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const out = { samples: [], console: [] };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route('**/*', (r) => (r.request().method() !== 'GET' ? r.abort() : r.continue()));
const page = await ctx.newPage();
page.on('pageerror', (e) => out.console.push('PAGEERROR ' + e.message));
await page.goto('http://localhost:3287/art-by-waambat', { waitUntil: 'load' });
await page.waitForTimeout(1500);
const probe = () => page.evaluate(() => {
  const t = [...document.querySelectorAll('.inline-video')].find((x) => x.dataset.saveUrl.includes('115879626'));
  if (!t) return null;
  const v = t.querySelector('video'), r = t.getBoundingClientRect();
  return { state: t.dataset.playbackState, provider: t.dataset.inlineProvider, top: Math.round(r.top), video: !!v,
    src: v ? (v.currentSrc || v.getAttribute('src') || '').split('/').pop().slice(0, 24) : null, delivery: v?.dataset.delivery ?? null,
    paused: v?.paused ?? null, readyState: v?.readyState ?? null, still: t.querySelector('img[data-video-first-frame]')?.complete ?? null };
});
out.before = await probe();
await page.evaluate(() => [...document.querySelectorAll('.inline-video')].find((x) => x.dataset.saveUrl.includes('115879626'))?.scrollIntoView({ block: 'center' }));
for (let i = 0; i < 8; i++) { await page.waitForTimeout(1000); out.samples.push(await probe()); }
// Scroll away and back: it should pause off screen and resume.
await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(1500); out.away = await probe();
await page.evaluate(() => [...document.querySelectorAll('.inline-video')].find((x) => x.dataset.saveUrl.includes('115879626'))?.scrollIntoView({ block: 'center' }));
await page.waitForTimeout(2500); out.back = await probe();
writeFileSync(new URL('./direct-tile.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await browser.close();
