import { chromium, BASE, PAGES, OUT, name } from './common.mjs';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch();
const views = { w320:[320,640,1], w360:[360,780,1], w390:[390,844,1], w768:[768,1024,1], w1440:[1440,900,1], zoom200:[720,450,2] };
const retry = async (page, fn) => { for (let i=0;i<4;i++) { try { return await fn(); } catch (e) { if (!/destroyed|navigation/.test(e.message)) throw e; console.error('reload during', page.url()); await page.waitForLoadState('load'); await page.waitForTimeout(1500); } } };
const report = { overflow: [], clipped: [], targets: {} };
for (const [v,[w,h,dsf]] of Object.entries(views)) {
  const mobile = w < 768 && v !== 'zoom200';
  const c = await browser.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:dsf, colorScheme:'dark', reducedMotion:'reduce', isMobile:mobile, hasTouch:mobile });
  for (const p of PAGES) {
    const page = await c.newPage();
    await page.goto(BASE+p, { waitUntil:'load' }); await page.waitForTimeout(1800);
    await retry(page, () => page.evaluate(async () => { for (let y=0; y<document.documentElement.scrollHeight; y+=500) { scrollTo(0,y); await new Promise(r=>setTimeout(r,40)); } scrollTo(0,0); }));
    await page.waitForTimeout(300);
    const r = await retry(page, () => page.evaluate(() => {
      const docW = document.documentElement.scrollWidth, vw = document.documentElement.clientWidth;
      const wide = [...document.querySelectorAll('body *')].filter(e => { const b = e.getBoundingClientRect(); if (!b.width) return false; const s = getComputedStyle(e); if (s.position === 'fixed' && s.visibility === 'hidden') return false; return b.right > vw + 1 && !e.closest('[aria-hidden=true]'); }).filter(e => { let p = e.parentElement; while (p) { const s = getComputedStyle(p); if (/(hidden|clip|auto|scroll)/.test(s.overflowX)) return false; p = p.parentElement; } return true; }).slice(0,5).map(e => `${e.tagName}.${(e.className||'').toString().slice(0,40)} right=${Math.round(e.getBoundingClientRect().right)}`);
      const small = [...document.querySelectorAll('a[href], button, [role=combobox], input:not([type=hidden]), textarea, [tabindex="0"]')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[aria-hidden=true],dialog:not([open]),.trap,[class*=trap]')).map(e => { const b = e.getBoundingClientRect(); const inline = getComputedStyle(e).display === 'inline' && e.closest('p,li'); return { label: (e.getAttribute('aria-label')||e.textContent).trim().slice(0,30), w: Math.round(b.width), h: Math.round(b.height), inline: !!inline }; }).filter(t => t.w < 24 || t.h < 24);
      return { docW, vw, wide, small };
    }));
    if (r.docW > r.vw) report.overflow.push({ v, p, docW: r.docW, vw: r.vw, wide: r.wide });
    if (v === 'w390') report.targets[p] = r.small;
    await page.screenshot({ path: OUT+`shots/resp-${v}-${name(p)}.png` });
    await page.close();
  }
  // menu at small widths
  if (mobile || v === 'zoom200') {
    const page = await c.newPage();
    await page.goto(BASE+'/contact-waambat', { waitUntil:'load' }); await page.waitForTimeout(1500);
    const menuBtn = page.locator('button[aria-label=Menu]');
    if (await menuBtn.isVisible()) {
      await menuBtn.click(); await page.waitForTimeout(500);
      const m = await page.evaluate(() => { const d = document.querySelector('#mobile-site-menu'); const vw = innerWidth, vh = innerHeight; const links = [...d.querySelectorAll('a,button')].map(a => { const b = a.getBoundingClientRect(); return { t: a.textContent.trim().slice(0,20), right: Math.round(b.right), bottom: Math.round(b.bottom) }; }); return { vw, vh, scrollH: d.scrollHeight, clientH: d.clientHeight, overflowX: d.scrollWidth > d.clientWidth, clippedRight: links.filter(l => l.right > vw) , lowest: Math.max(...links.map(l => l.bottom)) }; });
      report.clipped.push({ v, menu: m });
      await page.screenshot({ path: OUT+`shots/resp-${v}-menu.png` });
      await page.keyboard.press('Escape'); await page.waitForTimeout(400);
      report.clipped.push({ v, menuClosedUnderReduce: await page.evaluate(() => !document.querySelector('#mobile-site-menu')), focus: await page.evaluate(() => document.activeElement.getAttribute('aria-label')) });
    } else report.clipped.push({ v, menu: 'menu button not visible at this width' });
    // contact form at width: select list and submit
    await page.locator('#contact-contact-interest').scrollIntoViewIfNeeded();
    await page.click('#contact-contact-interest'); await page.waitForTimeout(300);
    const sel = await page.evaluate(() => { const l = document.querySelector('[role=listbox]'); const b = l.getBoundingClientRect(); return { left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), bottom: Math.round(b.bottom), vw: innerWidth, vh: innerHeight, docW: document.documentElement.scrollWidth }; });
    report.clipped.push({ v, select: sel });
    await page.screenshot({ path: OUT+`shots/resp-${v}-select-open.png` });
    await page.keyboard.press('Escape');
    const sub = await page.evaluate(() => { const b = document.querySelector('button[type=submit]').getBoundingClientRect(); const help = document.querySelector('button[type=submit]').nextElementSibling.getBoundingClientRect(); return { submitRight: Math.round(b.right), helpRight: Math.round(help.right), vw: innerWidth }; });
    report.clipped.push({ v, submit: sub });
    // Save dialog
    await page.locator('main img').first().scrollIntoViewIfNeeded();
    await page.locator('main img').first().click({ button:'right' }); await page.waitForTimeout(2500);
    const dlg = await page.evaluate(() => { const d = document.querySelector('.waambat-download'); const b = d.getBoundingClientRect(); return { left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), bottom: Math.round(b.bottom), scrollable: d.scrollHeight > d.clientHeight, vw: innerWidth, vh: innerHeight }; });
    report.clipped.push({ v, saveDialog: dlg });
    await page.screenshot({ path: OUT+`shots/resp-${v}-save-dialog.png` });
    await page.keyboard.press('Escape');
    await page.close();
  }
  await c.close();
}
await browser.close();
writeFileSync(OUT+'responsive.json', JSON.stringify(report,null,1));
console.log('OVERFLOW', JSON.stringify(report.overflow,null,1));
console.log('CLIPPED', report.clipped.map(x => JSON.stringify(x)).join('\n'));
console.log('SMALL TARGETS @390', Object.entries(report.targets).map(([p,t]) => p+': '+t.map(x=>`${x.label}(${x.w}x${x.h}${x.inline?' inline':''})`).join(', ')).join('\n'));
