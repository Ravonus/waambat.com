import { chromium, base } from './lib.mjs';
const b = await chromium.launch();
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(base + '/contact-waambat', { waitUntil: 'load' }); await page.waitForTimeout(1200);
console.log(await page.evaluate(() => { const names = ['--ui-accent','--ui-accent-hover','--ui-accent-nav-hover','--ui-accent-pressed','--ui-accent-focus','--ui-accent-border','--ui-accent-surface','--ui-accent-surface-strong','--ui-on-accent','--ui-on-accent-hover','--ui-danger']; const at = (el) => Object.fromEntries(names.map(n => [n, getComputedStyle(el).getPropertyValue(n).trim()])); return { root: at(document.documentElement), site: at(document.querySelector('.site-theme') || document.body), cursor: at(document.querySelector('.waambat-cursor')), dialog: at(document.querySelector('dialog.waambat-download') || document.body), req: getComputedStyle(document.querySelector('[class*=required]')).color }; }));
await b.close();
