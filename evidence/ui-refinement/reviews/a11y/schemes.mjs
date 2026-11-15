import { chromium, BASE, OUT } from './common.mjs';
import { createHash } from 'node:crypto';
const browser = await chromium.launch();
for (const scheme of ['dark','light','no-preference']) {
  const c = await browser.newContext({ viewport:{width:1440,height:900}, colorScheme:scheme, reducedMotion:'reduce' });
  const page = await c.newPage();
  await page.goto(BASE+'/contact-waambat', { waitUntil:'load' }); await page.waitForTimeout(2000);
  const r = await page.evaluate(() => { const g = (e) => e && getComputedStyle(e); const h = g(document.documentElement), i = g(document.querySelector('#contact-contact-name')), h2 = document.querySelector('h1,h2');
    return { html: h.colorScheme, bodyBg: g(document.body).backgroundColor, inputScheme: i.colorScheme, inputColor: i.color, heading: g(h2).color, headingText: h2.textContent.trim().slice(0,30), nativeSelectScheme: g(document.querySelector('select[name=interest]')).colorScheme, dialogScheme: g(document.querySelector('.waambat-download')).colorScheme }; });
  const shot = await page.screenshot(); 
  console.log(scheme, JSON.stringify(r), 'screenshot sha', createHash('sha1').update(shot).digest('hex').slice(0,12));
  await page.screenshot({ path: OUT+`shots/scheme-${scheme}-contact.png` });
  await c.close();
}
// forced colors
const c = await browser.newContext({ viewport:{width:1440,height:900}, forcedColors:'active', colorScheme:'dark', reducedMotion:'reduce' });
const page = await c.newPage();
await page.goto(BASE+'/contact-waambat', { waitUntil:'load' }); await page.waitForTimeout(2000);
await page.focus('#contact-contact-name');
const fc = async (sel, pseudo) => page.evaluate(([sel]) => { const e = document.activeElement; const s = getComputedStyle(e); const f = e.closest('[class*=frame]'); return { el: e.tagName, outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`, border: `${s.borderTopStyle} ${s.borderTopWidth} ${s.borderTopColor}`, frameOutline: f ? `${getComputedStyle(f).outlineStyle} ${getComputedStyle(f).outlineWidth} ${getComputedStyle(f).outlineColor}` : '' }; }, [sel]);
console.log('forced: input focus', JSON.stringify(await fc()));
await page.screenshot({ path: OUT+'shots/forced-colors-input-focus.png' });
await page.focus('#contact-contact-interest'); console.log('forced: combobox focus', JSON.stringify(await fc()));
await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(200);
console.log('forced: active option', JSON.stringify(await page.evaluate(() => { const o = document.querySelector('[role=option][data-active]'); const s = getComputedStyle(o); return { color: s.color, bg: s.backgroundColor, outline: s.outlineStyle, forcedAdjust: s.forcedColorAdjust }; })));
await page.locator('[role=listbox]').screenshot({ path: OUT+'shots/forced-colors-listbox.png' });
await page.keyboard.press('Escape');
await page.focus('button[type=submit]'); console.log('forced: submit focus', JSON.stringify(await fc()));
await page.locator('button[type=submit]').screenshot({ path: OUT+'shots/forced-colors-submit-focus.png' });
await page.focus('.site-nav-link'); console.log('forced: nav focus', JSON.stringify(await fc()));
await browser.close();
