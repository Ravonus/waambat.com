import { chromium, BASE } from './common.mjs';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport:{width:1440,height:900} })).newPage();
await page.goto(BASE+'/contact-waambat', { waitUntil:'load' }); await page.waitForTimeout(1500);
await page.focus('#contact-contact-interest'); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(300);
console.log(await page.evaluate(() => { const o = document.querySelector('[role=option][data-active]'); const out = [];
 const walk = (rules, sheet) => { for (const r of rules) { if (r.cssRules && !r.selectorText) walk(r.cssRules, sheet); else if (r.selectorText) { try { if (o.matches(r.selectorText) && /color/.test(r.style.cssText)) out.push(sheet + ' :: ' + r.selectorText + ' { ' + r.style.cssText.slice(0,200) + ' }'); } catch {} } } };
 for (const s of document.styleSheets) { try { walk(s.cssRules, (s.href||'inline').slice(-50)); } catch (e) { out.push('blocked '+s.href); } }
 return out.join('\n'); }));
await browser.close();
