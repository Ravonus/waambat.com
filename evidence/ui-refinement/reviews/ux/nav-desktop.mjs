import { chromium, base, shot, watchConsole, log } from './lib.mjs';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
const page = await c.newPage(); watchConsole(page, 'nav-desktop');
await page.goto(base + '/contact-waambat', { waitUntil: 'load' }); await page.waitForTimeout(1500);
const links = page.locator('header nav[aria-label="Main navigation"] a');
const n = await links.count();
const info = [];
for (let i = 0; i < n; i++) info.push(await links.nth(i).evaluate(a => ({ text: a.textContent, href: a.getAttribute('href'), current: a.getAttribute('aria-current'), color: getComputedStyle(a).color })));
const res = { links: info };
const get = (loc) => loc.evaluate(a => { const s = getComputedStyle(a), af = getComputedStyle(a, '::after'); return { color: s.color, outline: s.outline, transform: s.transform, after: { opacity: af.opacity, transform: af.transform, bg: af.backgroundColor, shadow: af.boxShadow } }; });
// hover non-current
const target = links.nth(2);
await target.hover(); await page.waitForTimeout(400);
res.hover = await get(target);
await shot(page, 'nav-desktop-hover', { clip: { x: 0, y: 0, width: 1440, height: 220 } });
// hover current
const cur = page.locator('header nav[aria-label="Main navigation"] a[aria-current=page]');
if (await cur.count()) { await cur.hover(); await page.waitForTimeout(400); res.hoverCurrent = await get(cur); res.restCurrent = null; await shot(page, 'nav-desktop-hover-current', { clip: { x: 0, y: 0, width: 1440, height: 220 } }); }
// pressed: mouse down hold
await target.hover(); await page.mouse.down(); await page.waitForTimeout(250);
res.pressed = await get(target);
await shot(page, 'nav-desktop-pressed', { clip: { x: 0, y: 0, width: 1440, height: 220 } });
await page.mouse.move(5, 500); await page.mouse.up();
// focus-visible via keyboard
await page.mouse.move(5, 500); await page.waitForTimeout(200);
await page.evaluate(() => document.activeElement?.blur());
await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
res.focused = await page.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return { tag: a.tagName, text: a.textContent?.slice(0, 40), outline: s.outline, outlineOffset: s.outlineOffset, color: s.color }; });
await shot(page, 'nav-desktop-focus', { clip: { x: 0, y: 0, width: 1440, height: 220 } });
// pending: delay route data
let release; const gate = new Promise(r => release = r);
await page.route(/\/(_kerf|__data|.*\.json|.*data).*/, async (route) => { if (route.request().resourceType() === 'fetch' || route.request().resourceType() === 'xhr') { await gate; } await route.continue(); });
const dest = links.filter({ hasText: /bio/i }).first();
await page.mouse.move(5, 500);
await dest.click({ noWaitAfter: true });
await page.waitForTimeout(500);
res.pending = await dest.evaluate(a => ({ pending: a.hasAttribute('data-pending'), color: getComputedStyle(a).color, spinner: getComputedStyle(a.querySelector('span[aria-hidden]')).opacity, spinnerColor: getComputedStyle(a.querySelector('span[aria-hidden]')).borderTopColor, url: location.pathname, progress: !!document.querySelector('[class*=progress]') }));
await shot(page, 'nav-desktop-pending', { clip: { x: 0, y: 0, width: 1440, height: 260 } });
await shot(page, 'nav-desktop-pending-full');
// with hover on the pending link
await dest.hover(); await page.waitForTimeout(300);
res.pendingHover = await dest.evaluate(a => ({ color: getComputedStyle(a).color }));
await shot(page, 'nav-desktop-pending-hover', { clip: { x: 0, y: 0, width: 1440, height: 260 } });
release();
await page.waitForURL(/bio/, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);
res.arrived = await page.evaluate(() => ({ url: location.pathname, active: document.activeElement?.tagName + '#' + document.activeElement?.id, title: document.title, scrollY }));
await shot(page, 'nav-desktop-arrived');
res.log = log;
writeFileSync(new URL('./nav-desktop.json', import.meta.url), JSON.stringify(res, null, 2));
console.log(JSON.stringify(res, null, 2));
await b.close();
