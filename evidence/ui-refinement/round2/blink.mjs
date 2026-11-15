import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const b = await chromium.launch();
// A narrow desktop window with a mouse: hover exists and the hamburger shows.
const p = await (await b.newContext({ viewport: { width: 700, height: 900 } })).newPage();
await p.goto('http://localhost:3287/mechanics', { waitUntil: 'load' }); await p.waitForTimeout(1200);
await p.locator('header button[aria-label="Menu"]').click(); await p.waitForTimeout(1200);
const link = p.locator('#mobile-site-menu a').nth(3);
await link.hover(); await p.waitForTimeout(150); await p.mouse.move(650, 850);
const samples = [];
for (let i = 0; i < 12; i++) { samples.push(await link.evaluate(a => Math.min(...[...a.querySelectorAll('span')].slice(0, 2).map(s => +getComputedStyle(s).opacity)))); await p.waitForTimeout(40); }
console.log('min label opacity after mouse-out', Math.min(...samples), samples.join(','));
await b.close();
