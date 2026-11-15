import { chromium, BASE } from './common.mjs';
const browser = await chromium.launch();
const c = await browser.newContext({ viewport:{width:1440,height:900}, colorScheme:'dark', reducedMotion:'reduce' });
const page = await c.newPage();
await page.goto(BASE+'/contact-waambat', { waitUntil:'load' }); await page.waitForTimeout(2000);
console.log(await page.evaluate(() => [...document.querySelectorAll('form input, form textarea, form select, form button, form [role]')].map(e => `${e.tagName} id=${e.id} type=${e.type} name=${e.name||''} req=${e.required} aria=${[...e.attributes].filter(a=>a.name.startsWith('aria')).map(a=>a.name+'='+a.value).join(',')} label=${e.labels?.[0]?.textContent?.trim()||''}`).join('\n')));
console.log(await page.evaluate(() => document.querySelector('form').noValidate));
await browser.close();
