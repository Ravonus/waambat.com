import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const b = await chromium.launch();
for (let i = 0; i < 3; i++) {
  const c = await b.newContext({ viewport: { width: 768, height: 1024 }, reducedMotion: 'reduce' });
  const p = await c.newPage();
  await p.goto('http://localhost:3287/art-by-waambat', { waitUntil: 'load' });
  const samples = [];
  for (const t of [300, 1000, 1800, 3500]) { await p.waitForTimeout(t - (samples.at(-1)?.t ?? 0)); samples.push({ t, ...(await p.evaluate(() => { const m = document.querySelector('.archive-montage'); const tile = document.querySelector('.archive-tile'); const prev = m?.previousElementSibling; return { montage: m?.getBoundingClientRect().top, tile: tile?.getBoundingClientRect().top, rows: document.querySelectorAll('.archive-row').length, firstRowH: document.querySelector('.archive-row')?.getBoundingClientRect().height, firstRowItems: document.querySelector('.archive-row')?.children.length }; })) }); }
  console.log(JSON.stringify(samples));
  await c.close();
}
await b.close();
