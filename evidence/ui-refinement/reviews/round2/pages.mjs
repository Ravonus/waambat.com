// Every public page at 1440 and 390: title colours, non-titles in wordmark pink, axe-core, console, overflow.
import fs from 'node:fs';
import { chromium, base, shots, save, guard, watchConsole, settle, pages, AXE } from './lib.mjs';
const axeSrc = fs.readFileSync(AXE, 'utf8');
const b = await chromium.launch();
const R = {}; const consoleLog = []; const blocked = [];
for (const [vp, opts] of [['1440', { viewport: { width: 1440, height: 900 } }], ['390', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }]]) {
  const ctx = await b.newContext({ ...opts, colorScheme: 'dark' }); await guard(ctx, blocked);
  for (const path of pages) {
    const page = await ctx.newPage(); watchConsole(page, consoleLog, vp + path);
    await page.goto(base + path); await settle(page, 2000);
    // scroll through so lazy content and scroll-driven arrivals resolve
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); });
    await page.waitForTimeout(600);
    const info = await page.evaluate(() => {
      const PINK = 'rgb(255, 148, 178)';
      const vis = e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none'; };
      const desc = e => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '') + ' "' + e.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) + '"';
      const headings = [...document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6, dialog h2')].filter(vis).map(h => ({ el: desc(h), color: getComputedStyle(h).color, size: getComputedStyle(h).fontSize, weight: getComputedStyle(h).fontWeight, pink: getComputedStyle(h).color === PINK }));
      const ownText = e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      const pinkNonTitles = [...document.querySelectorAll('body *')].filter(e => vis(e) && ownText(e) && getComputedStyle(e).color === PINK && !e.closest('h1,h2,h3,h4,h5,h6') && !e.closest('.site-logo, [class*=wordmark]') && !(e.closest('a[aria-current=page]'))).map(desc);
      const links = [...document.querySelectorAll('main a')].filter(vis).slice(0, 400).reduce((m, a) => { const k = getComputedStyle(a).color; m[k] = (m[k] || 0) + 1; return m; }, {});
      return { headings, pinkNonTitles: [...new Set(pinkNonTitles)].slice(0, 40), linkColors: links, overflow: [document.documentElement.scrollWidth, document.documentElement.clientWidth] };
    });
    await page.addScriptTag({ content: axeSrc });
    const axe = await page.evaluate(async () => { const r = await axe.run(document, { resultTypes: ['violations', 'incomplete'] }); return { violations: r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, targets: v.nodes.slice(0, 4).map(n => n.target.join(' ')) })), incomplete: r.incomplete.map(v => ({ id: v.id, n: v.nodes.length })) }; });
    R[vp + path] = { ...info, axe };
    if (vp === '1440') await page.screenshot({ path: shots + `page-${vp}${path === '/' ? '-home' : path.replace(/\//g, '-')}.png` });
    await page.close();
  }
  await ctx.close();
}
save('pages.json', { R, consoleLog, blocked });
for (const [k, v] of Object.entries(R)) console.log(k, 'axe:', v.axe.violations.map(x => `${x.id}(${x.impact})x${x.n}`).join(' ') || 'none', '| headings not pink:', v.headings.filter(h => !h.pink).length, '/', v.headings.length, '| pink non-titles:', v.pinkNonTitles.length, '| overflow', v.overflow.join('/'));
await b.close();
