import { chromium, BASE } from './common.mjs';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport:{width:1440,height:900} })).newPage();
await page.goto(BASE+'/contact-waambat', { waitUntil:'load' }); await page.waitForTimeout(1500);
console.log(await page.evaluate(() => { const names = ['--ui-accent','--ui-accent-hover','--ui-accent-nav-hover','--ui-accent-pressed','--ui-accent-focus','--ui-accent-border','--ui-accent-surface','--ui-accent-surface-strong','--ui-accent-disabled','--ui-on-accent','--ui-on-accent-hover','--ui-danger','--site-navigation','--site-active-navigation','--site-body','--color-waambat-pink','--color-waambat-logo'];
 const els = { root: document.documentElement, theme: document.querySelector('.site-theme'), contents: document.querySelector('.waambat-download')?.parentElement, form: document.querySelector('form') };
 return Object.entries(els).map(([k,e]) => k+': '+(e? names.map(n => n.replace('--','')+'='+getComputedStyle(e).getPropertyValue(n).trim()).join(' '):'missing')).join('\n'); }));
await browser.close();
