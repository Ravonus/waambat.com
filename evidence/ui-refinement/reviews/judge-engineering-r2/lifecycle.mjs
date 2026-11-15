// Engineering judge: lifecycle probes against the running dev server (read-only).
// Run: node lifecycle.mjs  -> lifecycle.json
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const base = 'http://localhost:3287';
const out = { console: [] };
const browser = await chromium.launch();
const guard = async (ctx) => ctx.route('**/*', (r) => {
  const q = r.request();
  if (q.method() !== 'GET' || q.url().includes('/media-originals/')) return r.abort();
  return r.continue();
});
// Count live listeners and rAF loops on document/window.
const instrument = () => {
  const live = new Map();
  const key = (t, type) => (t === window ? 'window:' : t === document ? 'document:' : '') + type;
  const add = EventTarget.prototype.addEventListener, rem = EventTarget.prototype.removeEventListener;
  const ids = new WeakMap();
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    if (this === window || this === document) {
      const cap = typeof opts === 'boolean' ? opts : !!opts?.capture;
      let m = ids.get(fn); if (!m) ids.set(fn, (m = new Set()));
      const k = key(this, type) + (cap ? ':c' : '');
      if (!m.has(k)) { m.add(k); live.set(k, (live.get(k) ?? 0) + 1); }
    }
    return add.call(this, type, fn, opts);
  };
  EventTarget.prototype.removeEventListener = function (type, fn, opts) {
    if (this === window || this === document) {
      const cap = typeof opts === 'boolean' ? opts : !!opts?.capture;
      const m = ids.get(fn), k = key(this, type) + (cap ? ':c' : '');
      if (m?.has(k)) { m.delete(k); live.set(k, live.get(k) - 1); }
    }
    return rem.call(this, type, fn, opts);
  };
  window.__listeners = () => Object.fromEntries([...live].filter(([, v]) => v));
  let raf = 0; const r0 = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { raf++; return r0(cb); };
  window.__raf = () => raf;
  const t0 = window.setTimeout.bind(window); let timers = 0;
  window.setTimeout = (cb, ms, ...a) => { if (ms === 600) timers++; return t0(cb, ms, ...a); };
  window.__menuDeadlines = () => timers;
};
const menuState = (page) => page.evaluate(() => {
  const d = document.querySelector('#mobile-site-menu');
  const mb = document.querySelector('header button[aria-label="Menu"]');
  return { present: !!d, phase: d?.dataset.phase ?? null, path: location.pathname, expanded: mb?.getAttribute('aria-expanded'),
    inert: [...document.querySelectorAll('[inert]')].length, htmlOverflow: document.documentElement.style.overflow, bodyPos: document.body.style.position };
});
const waitClosed = async (page, ms = 1500) => {
  const t = Date.now();
  while (Date.now() - t < ms) { const s = await menuState(page); if (!s.present) return { ...s, after: Date.now() - t }; await page.waitForTimeout(25); }
  return { ...(await menuState(page)), after: 'TIMEOUT' };
};

// 1. Menu lifecycle under each motion mode, three close paths, plus a reopen-during-closing race.
out.menu = {};
for (const mode of ['full', 'calm', 'off', 'reduced']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
  await guard(ctx); await ctx.addInitScript(instrument);
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') out.console.push(`[${mode}] ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => out.console.push(`[${mode}] PAGEERROR ${e.message}`));
  await page.goto(base + '/mechanics', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const setMode = () => page.evaluate((m) => { if (m !== 'reduced') document.querySelector('.site-theme').dataset.motion = m; }, mode);
  await setMode();
  const res = {};
  const open = async () => { await page.click('header button[aria-label="Menu"]'); await page.waitForTimeout(500); };
  await open(); res.openState = await menuState(page);
  await page.click('button[aria-label="Close menu"]'); res.closeX = await waitClosed(page);
  await open(); await page.keyboard.press('Escape'); res.closeEsc = await waitClosed(page);
  // Race: close, then reopen within 50ms, then close again.
  await open(); await page.click('button[aria-label="Close menu"]'); await page.waitForTimeout(50);
  const mid = await menuState(page);
  if (mid.present && mid.phase === 'closing') {
    await page.evaluate(() => document.querySelector('header button[aria-label="Menu"]').click()).catch(() => {});
  }
  await page.waitForTimeout(700);
  res.raceAfterReopen = { mid, now: await menuState(page) };
  if ((await menuState(page)).present) { await page.keyboard.press('Escape'); res.raceClose = await waitClosed(page); }
  await open();
  await page.click('#mobile-site-menu a[href="/bio-waambat"]');
  res.closeLink = await waitClosed(page, 2000);
  await page.waitForTimeout(300);
  res.afterLink = await menuState(page);
  res.deadlinesArmed = await page.evaluate(() => window.__menuDeadlines());
  res.listeners = await page.evaluate(() => window.__listeners());
  out.menu[mode] = res;
  await ctx.close();
}

// 2. Listener and rAF leak check across client-side navigations (desktop).
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await guard(ctx); await ctx.addInitScript(instrument);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => out.console.push(`[leak] PAGEERROR ${e.message}`));
  await page.goto(base + '/', { waitUntil: 'load' }); await page.waitForTimeout(1500);
  const snaps = [await page.evaluate(() => window.__listeners())];
  const route = ['/mechanics', '/bio-waambat', '/contact-waambat', '/ordinals', '/art-by-waambat', '/'];
  for (let i = 0; i < 2; i++) for (const href of route) {
    await page.evaluate((h) => document.querySelector(`header nav a[href="${h}"]`)?.click() ?? (location.href = h), href);
    await page.waitForTimeout(1200);
  }
  snaps.push(await page.evaluate(() => window.__listeners()));
  out.leak = { start: snaps[0], afterTwelveNavigations: snaps[1], path: await page.evaluate(() => location.pathname) };
  // 3. Scrollbar energy loop: rAF calls during and after a scroll burst.
  const rafAt = () => page.evaluate(() => window.__raf());
  const idle0 = await rafAt(); await page.waitForTimeout(1000); const idle1 = await rafAt();
  for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(16); }
  const burst = await rafAt(); await page.waitForTimeout(1000); const settled = await rafAt(); await page.waitForTimeout(1000); const settled2 = await rafAt();
  out.rail = { idleRafPerSecond: idle1 - idle0, duringBurstAndSettle: settled - burst, secondAfterSettle: settled2 - settled,
    railColors: await page.evaluate(() => { const c = document.querySelector('.waambat-scroll-rail canvas'); return c ? 'canvas' : 'none'; }) };
  await ctx.close();
}
// 4. Reduced motion: does the energy loop still spin?
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await guard(ctx); await ctx.addInitScript(instrument);
  const page = await ctx.newPage();
  await page.goto(base + '/mechanics', { waitUntil: 'load' }); await page.waitForTimeout(1500);
  const a = await page.evaluate(() => window.__raf());
  await page.mouse.move(700, 400);
  for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(16); }
  await page.waitForTimeout(1200);
  const b2 = await page.evaluate(() => window.__raf());
  out.railReduced = { rafDuringAndAfterScrollBurst: b2 - a };
  await ctx.close();
}
writeFileSync(new URL('./lifecycle.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await browser.close();
