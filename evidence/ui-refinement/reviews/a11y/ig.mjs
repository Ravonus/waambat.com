import { chromium, BASE, OUT } from './common.mjs';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport:{width:1440,height:900}, colorScheme:'dark', reducedMotion:'reduce' })).newPage();
await page.goto(BASE+'/instagram', { waitUntil:'load' }); await page.waitForTimeout(2500);
for (let i=0;i<13;i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(150); }
await page.waitForTimeout(800);
console.log(await page.evaluate(() => { const e = document.activeElement, r = e.getBoundingClientRect(); const anc = []; let p = e; while (p && p !== document.body) { const s = getComputedStyle(p); if (s.overflow !== 'visible' || s.opacity !== '1' || s.visibility !== 'visible' || s.clipPath !== 'none' || s.transform !== 'none') anc.push(`${p.tagName}.${(p.className||'').toString().slice(0,40)} ov=${s.overflow} op=${s.opacity} vis=${s.visibility} tf=${s.transform.slice(0,30)}`); p = p.parentElement; } return { text: e.textContent, rect: [r.x, r.y, r.width, r.height].map(Math.round), scrollY, innerHeight, anc }; }));
await page.screenshot({ path: OUT+'shots/instagram-focus-13.png' });
await browser.close();
