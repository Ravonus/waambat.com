import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const out = new URL('./', import.meta.url).pathname;
const b = await chromium.launch();
const errors = [];
const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, colorScheme: 'dark' });
const p = await c.newPage();
p.on('pageerror', e => errors.push(e.message)); p.on('console', m => m.type() === 'error' && !m.text().includes('NotSameOrigin') && errors.push(m.text()));
await p.goto('http://localhost:3287/mechanics', { waitUntil: 'load' }); await p.waitForTimeout(1500);
await p.screenshot({ path: out + 'm-closed.png' });
await p.locator('header button[aria-label="Menu"]').tap();
for (const t of [60, 140, 260]) { await p.waitForTimeout(t === 60 ? 60 : t - (t === 140 ? 60 : 140)); await p.screenshot({ path: out + `m-open-${t}.png` }); }
await p.waitForTimeout(700); await p.screenshot({ path: out + 'm-open.png' });
const focus = await p.evaluate(() => document.activeElement?.getAttribute('aria-label'));
const geo = await p.evaluate(() => { const r = document.querySelector('button[aria-label="Close menu"]').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
await p.locator('button[aria-label="Close menu"]').tap();
await p.waitForTimeout(110); await p.screenshot({ path: out + 'm-closing.png' });
await p.waitForTimeout(600);
const after = await p.evaluate(() => ({ open: !!document.querySelector('#mobile-site-menu'), focus: document.activeElement?.getAttribute('aria-label'), menuRect: (r => [r.x, r.y, r.width, r.height])(document.querySelector('header button[aria-label="Menu"]').getBoundingClientRect()) }));
// open again, navigate
await p.locator('header button[aria-label="Menu"]').tap(); await p.waitForTimeout(800);
await p.locator('#mobile-site-menu a', { hasText: 'bio' }).tap(); await p.waitForTimeout(1500);
const nav = await p.evaluate(() => ({ url: location.pathname, open: !!document.querySelector('#mobile-site-menu') }));
// desktop hover
const d = await b.newContext({ viewport: { width: 1440, height: 900 } }); const q = await d.newPage();
q.on('pageerror', e => errors.push(e.message));
await q.goto('http://localhost:3287/contact-waambat', { waitUntil: 'load' }); await q.waitForTimeout(1200);
const l = q.locator('header nav a').nth(3); await l.hover(); await q.waitForTimeout(90);
await q.screenshot({ path: out + 'd-nav-hover-burst.png', clip: { x: 300, y: 40, width: 840, height: 80 } });
await q.waitForTimeout(400); await q.screenshot({ path: out + 'd-nav-hover.png', clip: { x: 300, y: 40, width: 840, height: 80 } });
const h1 = q.locator('main h1, main h2').first(); const bb = await h1.boundingBox();
await q.mouse.move(bb.x + 40, bb.y + bb.height / 2); await q.waitForTimeout(300);
await q.screenshot({ path: out + 'd-cursor-over-title.png', clip: { x: bb.x, y: bb.y - 20, width: 200, height: 80 } });
await q.mouse.down(); await q.waitForTimeout(60); await q.screenshot({ path: out + 'd-cursor-press.png', clip: { x: bb.x, y: bb.y - 20, width: 200, height: 80 } }); await q.mouse.up();
await q.evaluate(() => scrollTo(0, 400)); await q.waitForTimeout(300);
await q.screenshot({ path: out + 'd-rail.png', clip: { x: 1380, y: 0, width: 60, height: 900 } });
console.log(JSON.stringify({ focus, geo, after, nav, errors }, null, 1));
await b.close();
