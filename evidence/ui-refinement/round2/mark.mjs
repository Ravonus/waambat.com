import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const out = new URL('./', import.meta.url).pathname, errors = [];
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
p.on('pageerror', e => errors.push(e.message));
for (const [path, sel, name] of [['/mechanics', 'a.site-logo', 'header'], ['/', '[data-hero-wordmark] a', 'hero']]) {
  await p.goto('http://localhost:3287' + path, { waitUntil: 'load' }); await p.waitForTimeout(1600);
  const el = p.locator(sel).first(); const bb = await el.boundingBox();
  const clip = { x: bb.x - 30, y: Math.max(0, bb.y - 30), width: bb.width + 60, height: bb.height + 60 };
  await p.screenshot({ path: out + `mark-${name}-rest.png`, clip });
  await el.hover(); await p.waitForTimeout(70); await p.screenshot({ path: out + `mark-${name}-burst.png`, clip });
  await p.waitForTimeout(500); await p.screenshot({ path: out + `mark-${name}-hover.png`, clip });
}
await p.goto('http://localhost:3287/blog-press', { waitUntil: 'load' }); await p.waitForTimeout(1200);
await p.mouse.move(700, 500);
for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 260); await p.waitForTimeout(16); }
await p.screenshot({ path: out + 'rail-scrolling.png', clip: { x: 1370, y: 0, width: 70, height: 900 } });
await p.waitForTimeout(700); await p.screenshot({ path: out + 'rail-settled.png', clip: { x: 1370, y: 0, width: 70, height: 900 } });
console.log(JSON.stringify({ errors }));
await b.close();
