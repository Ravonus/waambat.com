// Engineering judge: VideoEmbed's Vimeo error fallback in the archive viewer, and whether each open leaks a player.
// Run: node vimeo.mjs -> vimeo.json (read-only; non-GET requests and /media-originals/ are aborted).
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const base = 'http://localhost:3287';
const out = { console: [], opens: [] };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route('**/*', (r) => {
  const q = r.request();
  if (q.method() !== 'GET' || q.url().includes('/media-originals/')) return r.abort();
  return r.continue();
});
await ctx.addInitScript(() => {
  let message = 0;
  const add = window.addEventListener.bind(window), rem = window.removeEventListener.bind(window);
  const seen = new WeakSet();
  window.addEventListener = (type, fn, o) => { if (type === 'message' && !seen.has(fn)) { seen.add(fn); message++; } return add(type, fn, o); };
  window.removeEventListener = (type, fn, o) => { if (type === 'message' && seen.has(fn)) { seen.delete(fn); message--; } return rem(type, fn, o); };
  window.__message = () => message;
});
const page = await ctx.newPage();
page.on('pageerror', (e) => out.console.push('PAGEERROR ' + e.message));
await page.goto(base + '/art-by-waambat', { waitUntil: 'load' });
await page.waitForTimeout(2500);
out.vimeoTiles = await page.evaluate(() => [...document.querySelectorAll('.archive-tile')]
  .filter((t) => t.querySelector('.inline-video[data-inline-provider="vimeo"]'))
  .map((t) => ({ id: t.dataset.archiveArtwork, state: t.querySelector('.inline-video').dataset.playbackState })));
out.messageListenersBefore = await page.evaluate(() => window.__message());
const pick = out.vimeoTiles.find((t) => t.state === 'unavailable') ?? out.vimeoTiles[0];
out.picked = pick;
for (let i = 0; i < 4 && pick; i++) {
  await page.evaluate((id) => {
    const b = document.querySelector(`.archive-tile[data-archive-artwork="${id}"] .archive-expand`);
    b.scrollIntoView({ block: 'center' }); b.click();
  }, pick.id);
  await page.waitForTimeout(7000);
  const state = await page.evaluate(() => {
    const v = document.querySelector('.archive-viewer-media');
    return v ? { iframe: !!v.querySelector('iframe'), unavailable: !!v.querySelector('.inline-video-unavailable'),
      text: v.innerText.replace(/\s+/g, ' ').slice(0, 80), video: !!v.querySelector('video') } : { viewer: 'not open' };
  });
  state.messageListeners = await page.evaluate(() => window.__message());
  out.opens.push(state);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
}
out.messageListenersAfter = await page.evaluate(() => window.__message());
// Control: open a still-image archive item the same way; its viewer has no VideoEmbed.
const still = await page.evaluate(() => [...document.querySelectorAll('.archive-tile')].find((t) => !t.querySelector('.inline-video[data-inline-provider="vimeo"]'))?.dataset.archiveArtwork);
out.control = { id: still, before: await page.evaluate(() => window.__message()) };
for (let i = 0; i < 4 && still; i++) {
  await page.evaluate((id) => document.querySelector(`.archive-tile[data-archive-artwork="${id}"] .archive-expand`).click(), still);
  await page.waitForTimeout(1500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
}
out.control.after = await page.evaluate(() => window.__message());
writeFileSync(new URL('./vimeo.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await browser.close();
