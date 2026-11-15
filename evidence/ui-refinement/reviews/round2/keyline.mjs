// Is the cursor's dark keyline actually painted? Put a flat white / pink card under the cursor (inspection only)
// and count near-black pixels around the glyph, for the live CSS and for the same filter moved to the parent.
import { chromium, base, shots, save, settle, sharp } from './lib.mjs';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage(); await page.goto(base + '/contact-waambat'); await settle(page, 1500);
const R = {};
for (const [bg, label] of [['#ffffff', 'white'], ['#ff94b2', 'wordmark-pink'], ['#f1d1d6', 'save-hover']]) {
  await page.evaluate(bg => { let d = document.getElementById('__card'); if (!d) { d = document.createElement('div'); d.id = '__card'; d.style.cssText = 'position:fixed;left:600px;top:300px;width:200px;height:200px;z-index:2147483646'; document.body.append(d); } d.style.background = bg; }, bg);
  for (const variant of ['live', 'filter-on-parent']) {
    await page.evaluate(v => { const c = document.querySelector('.waambat-cursor'), s = c.querySelector('span'); if (v === 'live') { c.style.filter = ''; s.style.filter = ''; } else { c.style.filter = getComputedStyle(s).filter; s.style.filter = 'none'; } }, variant);
    await page.mouse.move(700, 400); await page.waitForTimeout(80); await page.mouse.move(701, 401); await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector('.waambat-cursor span').getAnimations().forEach(a => { a.pause(); a.currentTime = 0; }));
    const buf = await page.screenshot({ clip: { x: 690, y: 391, width: 40, height: 40 } });
    await sharp(buf).resize(160, 160, { kernel: 'nearest' }).toFile(shots + `keyline-${label}-${variant}.png`);
    const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    let dark = 0; for (let i = 0; i < data.length; i += info.channels) if (data[i] + data[i + 1] + data[i + 2] < 120) dark++;
    R[`${label}/${variant}`] = { darkPx: dark, state: await page.evaluate(() => document.querySelector('.waambat-cursor').dataset.cursorState) };
    await page.evaluate(() => document.querySelector('.waambat-cursor span').getAnimations().forEach(a => a.play()));
  }
}
save('keyline.json', R); console.log(JSON.stringify(R));
await b.close();
