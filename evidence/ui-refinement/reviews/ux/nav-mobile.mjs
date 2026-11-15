import { chromium, base, shot, watchConsole, log } from './lib.mjs';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const page = await c.newPage(); watchConsole(page, 'nav-mobile');
const res = {};
await page.goto(base + '/mechanics', { waitUntil: 'load' }); await page.waitForTimeout(1500);
await page.evaluate(() => scrollTo(0, 600)); await page.waitForTimeout(300);
const menu = page.locator('header button[aria-label="Menu"]');
res.menuButton = await menu.evaluate(b => ({ color: getComputedStyle(b).color, box: b.getBoundingClientRect().toJSON() }));
await menu.tap();
const frames = [];
for (const t of [40, 120, 300]) { await page.waitForTimeout(t === 40 ? 40 : t - (t === 120 ? 40 : 120)); await shot(page, `mobile-open-${t}ms`); }
res.open = await page.evaluate(() => ({ active: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent, phase: document.querySelector('#mobile-site-menu')?.dataset.phase, cursorVisible: getComputedStyle(document.querySelector('.waambat-cursor')).display, bodyFixed: document.body.style.position, scrollY: document.body.style.top }));
// close via close button
const close = page.locator('button[aria-label="Close menu"]');
res.closeColor = await close.evaluate(b => getComputedStyle(b).color);
await close.tap();
await page.waitForTimeout(80); await shot(page, 'mobile-close-80ms');
await page.waitForTimeout(400);
res.afterClose = await page.evaluate(() => ({ dialog: !!document.querySelector('#mobile-site-menu'), active: document.activeElement?.getAttribute('aria-label'), scrollY, bodyPos: document.body.style.position }));
// Escape
await menu.tap(); await page.waitForTimeout(400);
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
res.afterEscape = await page.evaluate(() => ({ dialog: !!document.querySelector('#mobile-site-menu'), active: document.activeElement?.getAttribute('aria-label'), scrollY }));
// Keyboard tab through menu: focus ring visibility on mobile links
await menu.tap(); await page.waitForTimeout(400);
await page.keyboard.press('Tab'); await page.waitForTimeout(150);
res.tabFocus = await page.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return { text: a.textContent, outline: s.outline, color: s.color }; });
await shot(page, 'mobile-menu-tab-focus');
// press-and-hold a destination to see pressed state on touch
const dest = page.locator('#mobile-site-menu a', { hasText: 'bio' });
const db = await dest.boundingBox();
const cdp = await c.newCDPSession(page);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: db.x + 10, y: db.y + db.height / 2 }] });
await page.waitForTimeout(200);
res.touchPressed = await dest.evaluate(a => ({ color: getComputedStyle(a).color, transform: getComputedStyle(a).transform }));
await shot(page, 'mobile-menu-touch-pressed');
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
// tap triggers navigation via click; slow data a bit
await page.waitForTimeout(60); await shot(page, 'mobile-tap-60ms');
await page.waitForTimeout(150); await shot(page, 'mobile-tap-210ms');
await page.waitForTimeout(250); await shot(page, 'mobile-tap-460ms');
await page.waitForURL(/bio/, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1200);
res.arrived = await page.evaluate(() => ({ url: location.pathname, dialog: !!document.querySelector('#mobile-site-menu'), active: document.activeElement?.id || document.activeElement?.tagName, scrollY, bodyPos: document.body.style.position, inert: [...document.querySelectorAll('[inert]')].length, current: document.querySelector('header nav a[aria-current=page]')?.textContent }));
await shot(page, 'mobile-arrived');
// After arrival: is the bio link left in a sticky hover/pressed colour? reopen menu and check
await menu.tap(); await page.waitForTimeout(400);
res.reopen = await page.evaluate(() => [...document.querySelectorAll('#mobile-site-menu a')].map(a => [a.textContent, getComputedStyle(a).color, a.getAttribute('aria-current')]));
await shot(page, 'mobile-menu-reopen');
res.log = log;
writeFileSync(new URL('./nav-mobile.json', import.meta.url), JSON.stringify(res, null, 2));
console.log(JSON.stringify(res, null, 2));
await b.close();
