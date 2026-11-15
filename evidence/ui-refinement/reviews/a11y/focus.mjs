import { chromium, BASE, OUT, name } from './common.mjs';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch();
const describe = () => { const e = document.activeElement; if (!e || e === document.body) return { el: 'BODY' }; const s = getComputedStyle(e); const r = e.getBoundingClientRect();
  const label = e.getAttribute('aria-label') || e.textContent.trim().replace(/\s+/g,' ').slice(0,40) || e.id;
  const ring = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 ? `outline ${s.outlineWidth} ${s.outlineColor} off ${s.outlineOffset}` : '';
  const fr = e.closest('[class*=frame]'); const frameRing = fr ? getComputedStyle(fr).boxShadow.includes('1.5px') : false;
  const after = getComputedStyle(e,'::after'); const underline = after.opacity === '0.8' ? 'underline::after' : '';
  const bef = getComputedStyle(e,'::before'); 
  const visible = r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  return { el: e.tagName.toLowerCase() + (e.getAttribute('role') ? `[${e.getAttribute('role')}]` : ''), label, ring: ring || (frameRing ? 'frame inset 1.5px ring' : '') || underline || 'NONE', opacity: s.opacity, inView: visible, size: `${Math.round(r.width)}x${Math.round(r.height)}` }; };
const results = {};
for (const [vpName, vp] of [['desktop',[1440,900]],['phone',[390,844]]]) {
  const c = await browser.newContext({ viewport:{width:vp[0],height:vp[1]}, colorScheme:'dark', reducedMotion:'reduce', isMobile: vp[0]<768, hasTouch: vp[0]<768 });
  for (const p of ['/', '/contact-waambat', '/art-by-waambat', '/ordinals', '/instagram']) {
    const page = await c.newPage();
    await page.goto(BASE+p, { waitUntil:'load' }); await page.waitForTimeout(2000);
    const stops = [];
    for (let i = 0; i < 22; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(120); stops.push(await page.evaluate(describe)); }
    results[`${vpName} ${p}`] = stops;
    await page.close();
  }
  await c.close();
}
await browser.close();
writeFileSync(OUT+'focus-order.json', JSON.stringify(results,null,1));
for (const [k, stops] of Object.entries(results)) { console.log('\n== '+k); stops.forEach((s,i) => console.log(`${i+1}. ${s.el} "${s.label}" ${s.size} ring=${s.ring} inView=${s.inView} op=${s.opacity}`)); }
