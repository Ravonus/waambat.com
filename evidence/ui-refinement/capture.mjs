// Matching before/after capture for the pastel UI pass. Usage: node capture.mjs <label>
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/waambat/package.json');
const { chromium } = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const label = process.argv[2] ?? 'before';
const base = process.env.BASE ?? 'http://localhost:3287';
const out = new URL(`./${label}/`, import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const pages = ['/', '/ordinals', '/mechanics', '/art-by-waambat', '/instagram', '/blog-press', '/bio-waambat', '/contact-waambat'];
const views = { phone360: [360, 800], phone390: [390, 844], tablet: [768, 1024], desktop: [1440, 900] };
const name = (p) => (p === '/' ? 'home' : p.slice(1));
const browser = await chromium.launch();
const report = { label, console: [], overflow: [] };
async function ctx(view, scheme = 'dark', motion = 'reduce') {
  const [width, height] = views[view];
  const c = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, reducedMotion: motion, hasTouch: width < 768, isMobile: width < 768 });
  return c;
}
async function open(c, path) {
  const page = await c.newPage();
  page.on('console', (m) => { if (m.type() === 'error') report.console.push({ path, text: m.text().slice(0, 300) }); });
  page.on('pageerror', (e) => report.console.push({ path, text: 'pageerror ' + e.message.slice(0, 300) }));
  await page.goto(base + path, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1800);
  return page;
}
const shot = (page, file, opts = {}) => page.screenshot({ path: out + file + '.png', ...opts });
// 1. Every page at every width, top and one scrolled position (dark scheme, reduced motion for stable frames).
for (const view of Object.keys(views)) {
  const c = await ctx(view);
  for (const p of pages) {
    const page = await open(c, p);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (ov > 0) report.overflow.push({ view, p, ov });
    await shot(page, `${view}-${name(p)}-top`);
    await page.evaluate(() => scrollTo(0, 900));
    await page.waitForTimeout(500);
    await shot(page, `${view}-${name(p)}-scrolled`);
    await page.close();
  }
  await c.close();
}
// 2. Light OS scheme must not change the dark presentation (contact page and admin login).
for (const scheme of ['light', 'dark']) {
  const c = await ctx('desktop', scheme);
  for (const p of ['/contact-waambat', '/admin']) {
    const page = await open(c, p);
    await shot(page, `scheme-${scheme}-${p === '/admin' ? 'admin' : 'contact'}`);
    await page.close();
  }
  await c.close();
}
// 3. Interaction states on desktop (motion allowed so hover transitions finish).
{
  const c = await ctx('desktop', 'dark', 'no-preference');
  const page = await open(c, '/contact-waambat');
  const nav = page.locator('header nav a').nth(2);
  await nav.hover(); await page.waitForTimeout(400);
  await shot(page, 'state-nav-hover', { clip: { x: 0, y: 0, width: 1440, height: 260 } });
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  await shot(page, 'state-focus-visible-nav', { clip: { x: 0, y: 0, width: 1440, height: 260 } });
  const form = page.locator('form').first();
  await form.scrollIntoViewIfNeeded();
  const field = form.locator('input:not([type=hidden]):not([tabindex="-1"])').first();
  await field.click(); await page.waitForTimeout(300);
  await shot(page, 'state-field-focus');
  const submit = form.locator('button[type=submit]');
  await submit.hover(); await page.waitForTimeout(400);
  await shot(page, 'state-submit-hover');
  await page.mouse.move(5, 5);
  await submit.click(); await page.waitForTimeout(500);
  await shot(page, 'state-invalid');
  const selectButton = form.locator('button[aria-haspopup]').first();
  if (await selectButton.count()) {
    await selectButton.click(); await page.waitForTimeout(400);
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(200);
    await shot(page, 'state-select-open');
    await page.keyboard.press('Escape');
  }
  // Selection colour
  await page.evaluate(() => { const h = document.querySelector('main h1, main h2, main p'); const r = document.createRange(); r.selectNodeContents(h); getSelection().removeAllRanges(); getSelection().addRange(r); });
  await shot(page, 'state-selection', { clip: { x: 0, y: 200, width: 1440, height: 400 } });
  await page.close();
  const home = await open(c, '/');
  await home.mouse.move(700, 300); await home.waitForTimeout(400);
  await shot(home, 'state-cursor-default', { clip: { x: 620, y: 220, width: 160, height: 160 } });
  const link = home.locator('header nav a').nth(1);
  const b = await link.boundingBox();
  if (b) { await home.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await home.waitForTimeout(500);
    await shot(home, 'state-cursor-pointer-nav', { clip: { x: Math.max(0, b.x - 60), y: Math.max(0, b.y - 40), width: 220, height: 120 } }); }
  const control = home.locator('.media-control').first();
  if (await control.count()) { await control.hover({ force: true }); await home.waitForTimeout(400);
    const cb = await control.boundingBox(); if (cb) await shot(home, 'state-media-control-hover', { clip: { x: Math.max(0, cb.x - 40), y: Math.max(0, cb.y - 40), width: 200, height: 120 } }); }
  await home.close();
  const ord = await open(c, '/ordinals');
  const action = ord.locator('button').filter({ hasText: /./ }).nth(0);
  await ord.evaluate(() => scrollTo(0, 500)); await ord.waitForTimeout(500);
  await shot(ord, 'state-ordinals-controls');
  await ord.close();
  await c.close();
}
// 4. Mobile menu open.
{
  const c = await ctx('phone390', 'dark', 'no-preference');
  const page = await open(c, '/mechanics');
  const btn = page.locator('header button').first();
  await btn.click(); await page.waitForTimeout(700);
  await shot(page, 'state-mobile-menu-open');
  await page.close(); await c.close();
}
await browser.close();
writeFileSync(out + 'report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ shots: out, console: report.console.length, overflow: report.overflow }, null, 1));
