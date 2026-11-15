// axe on every page (390, 1440), 200% zoom overflow + menu, forced colors, reduced-motion animation census, CLS.
import { chromium, guard, go, save, shots, pages, pname, AXE } from './lib.mjs';
import fs from 'node:fs';
const axeSrc = fs.readFileSync(AXE, 'utf8');
const b = await chromium.launch(); const R = { axe: {}, zoom: [], forced: {}, reduced: {}, cls: {} };
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: 'dark', reducedMotion: 'reduce', hasTouch: w < 768, isMobile: w < 768 }); await guard(ctx);
  for (const p of pages) {
    const page = await ctx.newPage(); await go(page, p, 2000);
    await page.evaluate(axeSrc);
    const r = await page.evaluate(async () => { const res = await axe.run(document, { resultTypes: ['violations'] }); return res.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes.slice(0, 2).map(n => n.target.join(' ').slice(0, 80)) })); });
    R.axe[`${w}${p}`] = r; await page.close();
  }
  await ctx.close();
}
// 200% zoom: 1440x900 window at 200% => 720x450 CSS px, DPR 2
{
  const ctx = await b.newContext({ viewport: { width: 720, height: 450 }, deviceScaleFactor: 2, colorScheme: 'dark' }); await guard(ctx);
  for (const p of pages) {
    const page = await ctx.newPage(); await go(page, p, 1800);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    const nav = await page.evaluate(() => { const m = document.querySelector('header button[aria-label="Menu"]'); return m ? getComputedStyle(m).display !== 'none' && m.getBoundingClientRect().width > 0 : false; });
    R.zoom.push({ p, overflow: ov, menuButton: nav });
    if (p === '/contact-waambat' || p === '/mechanics') await page.screenshot({ path: `${shots}zoom200-${pname(p)}.png` });
    if (p === '/mechanics' && nav) {
      await page.locator('header button[aria-label="Menu"]').click(); await page.waitForTimeout(900);
      await page.evaluate(() => document.getElementById('mobile-site-menu').scrollTo(0, 9999)); await page.waitForTimeout(300);
      const x = await page.evaluate(() => { const c = document.querySelector('button[aria-label="Close menu"]').getBoundingClientRect(); const links = [...document.querySelectorAll('#mobile-site-menu nav a')].map(a => a.getBoundingClientRect()); return { closeY: c.y, closeInView: c.y >= 0 && c.bottom <= innerHeight, lastLinkBottom: Math.max(...links.map(l => l.bottom)) }; });
      R.zoomMenu = x; await page.screenshot({ path: `${shots}zoom200-menu-scrolled.png` });
    }
    await page.close();
  }
  await ctx.close();
}
// Forced colors
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', forcedColors: 'active' }); await guard(ctx);
  const page = await ctx.newPage(); await go(page, '/contact-waambat', 2000);
  const field = page.locator('main input[name=name]'); await field.scrollIntoViewIfNeeded(); await field.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(300);
  R.forced.field = await field.evaluate(e => { const w = e.closest('[data-mosh-field]') || e.parentElement; return { outline: getComputedStyle(e).outline, wOutline: getComputedStyle(w).outline }; });
  const bb = await field.boundingBox(); await page.screenshot({ path: shots + 'forced-field-focus.png', clip: { x: bb.x - 40, y: bb.y - 50, width: bb.width + 80, height: 400 } });
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.waitForTimeout(200);
  R.forced.nav = await page.evaluate(() => ({ el: document.activeElement.textContent.trim(), outline: getComputedStyle(document.activeElement).outline }));
  await page.screenshot({ path: shots + 'forced-nav-focus.png', clip: { x: 0, y: 0, width: 1440, height: 140 } });
  await ctx.close();
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', forcedColors: 'active', hasTouch: true, isMobile: true }); await guard(m);
  const mp = await m.newPage(); await go(mp, '/bio-waambat', 1500); await mp.locator('header button[aria-label="Menu"]').tap(); await mp.waitForTimeout(900);
  await mp.screenshot({ path: shots + 'forced-menu-open.png' }); await m.close();
}
// Reduced-motion census: running animations after load, after hover, after menu open
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', reducedMotion: 'reduce' }); await guard(ctx);
  const page = await ctx.newPage(); await go(page, '/contact-waambat', 2000);
  const census = () => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && (a.effect?.getTiming().duration ?? 0) > 20).map(a => a.animationName || a.transitionProperty || 'anim'));
  R.reduced.idle = await census();
  const nb = await page.locator('header nav a').nth(3).boundingBox(); await page.mouse.move(nb.x + 10, nb.y + 5); await page.waitForTimeout(30);
  R.reduced.hover = await census(); await page.mouse.down(); await page.waitForTimeout(30); R.reduced.press = await census(); await page.mouse.move(700, 600); await page.mouse.up();
  await ctx.close();
}
// CLS with full motion while scrolling mechanics and home
for (const [p, w, h] of [['/mechanics', 1512, 950], ['/', 1440, 900], ['/mechanics', 390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: 'dark' }); await guard(ctx);
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__ls = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__ls.push({ v: e.value, t: Math.round(e.startTime), input: e.hadRecentInput, src: (e.sources || []).slice(0, 2).map(s => (s.node?.tagName || '') + ' ' + JSON.stringify([s.previousRect.y, s.currentRect.y, s.previousRect.height, s.currentRect.height].map(Math.round))) }); }).observe({ type: 'layout-shift', buffered: true }); });
  await go(page, p, 1500);
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 400) { await page.mouse.wheel(0, 400); await page.waitForTimeout(350); }
  await page.waitForTimeout(1200);
  const ls = await page.evaluate(() => window.__ls);
  R.cls[`${p}@${w}`] = { total: +ls.reduce((s, e) => s + e.v, 0).toFixed(4), big: ls.filter(e => e.v > 0.01).slice(0, 6) };
  await ctx.close();
}
save(process.env.SUFFIX ? 'a11y'+process.env.SUFFIX+'.json' : 'a11y.json', R);
for (const [k, v] of Object.entries(R.axe)) console.log('axe', k, v.map(x => `${x.id}(${x.impact})x${x.n}`).join(' '));
console.log('zoom', JSON.stringify(R.zoom), JSON.stringify(R.zoomMenu));
console.log('forced', JSON.stringify(R.forced)); console.log('reduced', JSON.stringify(R.reduced)); console.log('cls', JSON.stringify(R.cls));
await b.close();
