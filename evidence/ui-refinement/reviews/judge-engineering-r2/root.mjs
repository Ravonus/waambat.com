// Engineering judge r2: theme variables on :root, html-level consumers, and the rail re-reading colours per draw.
// Run: node root.mjs -> root.json (read-only; non-GET and /media-originals/ aborted).
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const out = {};
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route('**/*', (r) => (r.request().method() !== 'GET' || r.request().url().includes('/media-originals/') ? r.abort() : r.continue()));
const page = await ctx.newPage();
// Server HTML: does <html> carry the vars before hydration?
const res = await page.request.get('http://localhost:3287/contact-waambat');
const html = await res.text();
out.ssrHtmlTag = (html.match(/<html[^>]*>/) || [''])[0].slice(0, 200);
out.ssrHtmlHasUiAccent = /<html[^>]*--ui-accent/.test(html);
await page.goto('http://localhost:3287/contact-waambat', { waitUntil: 'load' });
await page.waitForTimeout(1500);
const read = () => page.evaluate(() => {
  const s = document.documentElement.style, cs = getComputedStyle(document.documentElement);
  return { inlineVars: [...s].filter((k) => k.startsWith('--')).length, uiAccent: s.getPropertyValue('--ui-accent'), accentColor: cs.accentColor, scrollbarColor: cs.scrollbarColor,
    wrapperDisplayContents: [...document.body.querySelectorAll('div')].filter((d) => d.style.display === 'contents').length };
});
out.hydrated = await read();
// Navigate client-side twice and confirm the vars survive (cleanup/re-apply on each content change).
for (const href of ['/bio-waambat', '/mechanics']) {
  await page.evaluate((h) => document.querySelector(`header nav a[href="${h}"]`)?.click(), href);
  await page.waitForTimeout(1500);
}
out.afterNavigation = await read();
// Rail: change the cursor token on :root and sample the canvas thumb colour after a redraw.
const sampleRail = () => page.evaluate(() => {
  const c = document.querySelector('.waambat-scroll-rail canvas'); if (!c) return null;
  const ctx = c.getContext('2d'); const { width, height } = c;
  const data = ctx.getImageData(0, 0, width, height).data; const seen = {};
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 250) { const k = `${data[i]},${data[i + 1]},${data[i + 2]}`; seen[k] = (seen[k] || 0) + 1; }
  return Object.entries(seen).sort((a, b) => b[1] - a[1]).slice(0, 2);
});
out.railBefore = await sampleRail();
await page.evaluate(() => { for (const k of ['--ui-cursor', '--ui-cursor-light', '--ui-cursor-deep']) document.documentElement.style.setProperty(k, '#00ff00'); });
await page.mouse.wheel(0, 200); await page.waitForTimeout(1500);
out.railAfterTokenChange = await sampleRail();
writeFileSync(new URL('./root.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await browser.close();
