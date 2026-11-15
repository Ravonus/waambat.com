import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const base = 'http://localhost:3287', dir = new URL('./', import.meta.url).pathname;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
const out = {};
for (const p of ['/', '/ordinals', '/mechanics', '/art-by-waambat', '/instagram', '/blog-press', '/bio-waambat', '/contact-waambat']) {
  const page = await ctx.newPage(); await page.goto(base + p, { waitUntil: 'load' }); await page.waitForTimeout(1500);
  await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 900) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } });
  out[p] = await page.evaluate(() => { const g = {}; for (const a of document.querySelectorAll('main a')) { const c = getComputedStyle(a); if (!a.getBoundingClientRect().width) continue; const k = `${c.color} | deco=${c.textDecorationLine} | ${c.fontSize} ${c.fontWeight} | cls=${String(a.className).split(' ').filter(x => /link|waambat|source|caption|ordinal|_/.test(x)).join('.')} | parent=${a.parentElement.tagName}`; (g[k] ??= []).push(a.textContent.trim().slice(0, 22)); } return Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.length + ' e.g. ' + v.slice(0, 3).join(' / ')])); });
  if (p === '/art-by-waambat') { const loc = page.locator('main a.text-waambat-link').first(); if (await loc.count()) { await loc.scrollIntoViewIfNeeded(); const b = await loc.boundingBox(); await page.screenshot({ path: dir + 'v-token-link.png', clip: { x: Math.max(0, b.x - 200), y: Math.max(0, b.y - 160), width: 700, height: 220 } }); } }
  await page.close();
}
await browser.close(); console.log(JSON.stringify(out, null, 1));
