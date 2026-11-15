// Fresh captures matching the baseline (dark, reduced motion, same widths/scroll) + overflow, broken images, console, title colours.
import { chromium, guard, watchConsole, save, go, shots, pages, pname } from './lib.mjs';
import fs from 'node:fs';
const views = { phone360: [360, 800], phone390: [390, 844], tablet: [768, 1024], desktop: [1440, 900] };
const b = await chromium.launch(); const R = { overflow: [], broken: [], console: [], titles: {}, blocked: [] };
fs.mkdirSync(shots + (process.env.NOW || 'now'), { recursive: true });
for (const [view, [width, height]] of Object.entries(views)) {
  const ctx = await b.newContext({ viewport: { width, height }, colorScheme: 'dark', reducedMotion: 'reduce', hasTouch: width < 768, isMobile: width < 768 });
  await guard(ctx, R.blocked);
  for (const p of pages) {
    const page = await ctx.newPage(); watchConsole(page, R.console, view + p);
    await go(page, p, 2500);
    const info = await page.evaluate(() => {
      const ov = document.documentElement.scrollWidth - innerWidth;
      const wide = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 5).map(e => e.tagName + '.' + e.className.toString().slice(0, 40));
      const broken = [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.getBoundingClientRect().width > 0 && getComputedStyle(i).visibility !== 'hidden').map(i => (i.currentSrc || i.getAttribute('src') || '(none)').slice(0, 100));
      const titles = [...document.querySelectorAll('main h1, main h2, main h3')].slice(0, 6).map(h => [h.tagName, h.textContent.trim().slice(0, 30), getComputedStyle(h).color, getComputedStyle(h).fontSize]);
      return { ov, wide, broken, titles, docH: document.documentElement.scrollHeight };
    });
    if (info.ov > 0) R.overflow.push({ view, p, ov: info.ov, wide: info.wide });
    if (info.broken.length) R.broken.push({ view, p, broken: info.broken });
    if (view === 'desktop' || view === 'phone390') R.titles[view + p] = info.titles;
    await page.screenshot({ path: `${shots}${process.env.NOW || 'now'}/${view}-${pname(p)}-top.png` });
    await page.evaluate(() => scrollTo(0, 900)); await page.waitForTimeout(700);
    await page.screenshot({ path: `${shots}${process.env.NOW || 'now'}/${view}-${pname(p)}-scrolled.png` });
    await page.close();
  }
  await ctx.close();
}
save('pages' + (process.env.SUFFIX || '') + '.json', R);
console.log('overflow', JSON.stringify(R.overflow)); console.log('broken', JSON.stringify(R.broken)); console.log('console', R.console.length, JSON.stringify(R.console.filter(c => c.type === 'pageerror'))); console.log('blocked', R.blocked.length);
await b.close();
