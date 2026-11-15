import { chromium, base } from './lib.mjs';
const b = await chromium.launch();
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(base + '/contact-waambat', { waitUntil: 'load' }); await page.waitForTimeout(1200);
console.log(await page.evaluate(() => [...document.querySelectorAll('form [id], form input, form textarea, form button')].map(e => `${e.tagName} id=${e.id} name=${e.getAttribute('name')} type=${e.getAttribute('type')} role=${e.getAttribute('role')} req=${e.required||e.getAttribute('aria-required')}`).join('\n')));
console.log(await page.evaluate(() => document.querySelector('form').getBoundingClientRect().top + scrollY));
await b.close();
