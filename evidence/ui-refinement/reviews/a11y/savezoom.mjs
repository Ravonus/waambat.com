import { chromium, BASE, OUT } from './common.mjs';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:2, colorScheme:'dark', reducedMotion:'reduce' })).newPage();
await page.goto(BASE+'/bio-waambat', { waitUntil:'load' }); await page.waitForTimeout(2000);
const img = page.locator('main img').first(); await img.scrollIntoViewIfNeeded();
await img.click({ button:'right' }); await page.waitForTimeout(3000);
await page.mouse.move(0,0);
const save = page.locator('.waambat-download-save');
console.log(await save.evaluate(e => { const s = getComputedStyle(e); return { color: s.color, opacity: s.opacity, fontWeight: s.fontWeight, font: s.fontFamily, filter: s.filter, mix: s.mixBlendMode, children: [...e.querySelectorAll('*')].map(c => getComputedStyle(c).color) }; }));
await save.screenshot({ path: OUT+'shots/save-button-2x.png' });
// sample pixel darkness via canvas
const buf = await save.screenshot();
await page.evaluate(() => document.activeElement.blur());
const b64 = buf.toString('base64');
const darkest = await page.evaluate(async (b64) => { const im = new Image(); im.src = 'data:image/png;base64,'+b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im,0,0); const d = x.getImageData(0,0,c.width,c.height).data; let min = [255,255,255], ml = 999; for (let i=0;i<d.length;i+=4) { const l = d[i]+d[i+1]+d[i+2]; if (l < ml) { ml = l; min = [d[i],d[i+1],d[i+2]]; } } return min; }, b64);
console.log('darkest pixel in Save button', darkest);
await browser.close();
