import { chromium, BASE, OUT, cr, rgbToHex } from './common.mjs';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch();
const c = await browser.newContext({ viewport:{width:1440,height:900}, colorScheme:'dark', reducedMotion:'reduce' });
const page = await c.newPage();
const log = (...a) => console.log(...a);
await page.goto(BASE+'/contact-waambat', { waitUntil:'load' }); await page.waitForTimeout(2000);
const st = (sel, pseudo) => page.evaluate(([sel,pseudo]) => { const e = document.querySelector(sel); if (!e) return null; const s = getComputedStyle(e, pseudo||null); return { color:s.color, bg:s.backgroundColor, boxShadow:s.boxShadow, outline:`${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} off ${s.outlineOffset}`, border:`${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`, opacity:s.opacity, transform:s.transform }; }, [sel,pseudo]);
const frame = '#contact-contact-name';
log('frame rest', await page.evaluate(() => { const f = document.querySelector('#contact-contact-name').parentElement; const s = getComputedStyle(f); return { bg:s.backgroundColor, shadow:s.boxShadow }; }));
log('label rest', await st('label[for=contact-contact-name]'));
await page.hover(frame); await page.waitForTimeout(300);
log('frame hover', await page.evaluate(() => getComputedStyle(document.querySelector('#contact-contact-name').parentElement).boxShadow));
await page.mouse.move(0,0);
// Keyboard focus into name
await page.focus('#contact-contact-name'); await page.waitForTimeout(300);
log('frame focus', await page.evaluate(() => { const f = document.querySelector('#contact-contact-name').parentElement; const s = getComputedStyle(f); return { bg:s.backgroundColor, shadow:s.boxShadow }; }));
log('label focus', await st('label[for=contact-contact-name]'));
await page.locator(frame).screenshot({ path: OUT+'shots/field-focus.png' });
// select: keyboard
await page.focus('#contact-contact-interest');
log('select button focus', await st('#contact-contact-interest'));
log('select frame focus', await page.evaluate(() => getComputedStyle(document.querySelector('#contact-contact-interest').closest('[class*=frame]')).boxShadow));
await page.keyboard.press('ArrowDown'); await page.waitForTimeout(300);
log('expanded', await page.getAttribute('#contact-contact-interest','aria-expanded'), 'activedesc', await page.getAttribute('#contact-contact-interest','aria-activedescendant'));
await page.keyboard.press('ArrowDown'); await page.waitForTimeout(200);
const opts = await page.evaluate(() => { const list = document.querySelector('[role=listbox]'); const ls = getComputedStyle(list); return { list: { bg: ls.backgroundColor, border: ls.borderTopColor }, opts: [...list.querySelectorAll('[role=option]')].map(o => { const s = getComputedStyle(o); return { text:o.textContent.trim(), active:o.hasAttribute('data-active'), selected:o.getAttribute('aria-selected'), color:s.color, bg:s.backgroundColor, h:o.getBoundingClientRect().height }; }) }; });
log('listbox', JSON.stringify(opts, null, 0));
await page.locator('[role=listbox]').screenshot({ path: OUT+'shots/select-open-keyboard-active2.png' });
await page.keyboard.press('Enter'); await page.waitForTimeout(200);
log('after Enter focus=', await page.evaluate(() => document.activeElement.id), 'value=', await page.evaluate(() => document.querySelector('select[name=interest]').value));
await page.keyboard.press('ArrowDown'); await page.waitForTimeout(200);
const opts2 = await page.evaluate(() => [...document.querySelectorAll('[role=option]')].map(o => { const s = getComputedStyle(o); return { text:o.textContent.trim(), active:o.hasAttribute('data-active'), selected:o.getAttribute('aria-selected'), color:s.color, bg:s.backgroundColor, check: !!o.querySelector('svg') && getComputedStyle(o.querySelector('svg')).color }; }));
log('reopened (selected + active same)', JSON.stringify(opts2));
await page.keyboard.press('ArrowDown'); await page.waitForTimeout(200);
await page.locator('[role=listbox]').screenshot({ path: OUT+'shots/select-open-selected-vs-active.png' });
await page.keyboard.press('Escape'); await page.waitForTimeout(200);
log('after Escape expanded=', await page.getAttribute('#contact-contact-interest','aria-expanded'), 'focus=', await page.evaluate(() => document.activeElement.id));
// mouse hover option
await page.click('#contact-contact-interest'); await page.waitForTimeout(200);
const o3 = page.locator('[role=option]').nth(3); await o3.hover(); await page.waitForTimeout(200);
log('hover option', await o3.evaluate(o => { const s = getComputedStyle(o); return [s.color, s.backgroundColor, o.hasAttribute('data-active')]; }));
await page.mouse.click(5,5); await page.waitForTimeout(200);
log('outside click closes', await page.getAttribute('#contact-contact-interest','aria-expanded'));
// submit button states
await page.mouse.move(0,0);
log('submit rest', await st('button[type=submit]'), 'before', await st('button[type=submit]','::before'));
await page.hover('button[type=submit]'); await page.waitForTimeout(400);
log('submit hover', await st('button[type=submit]'), 'before', await st('button[type=submit]','::before'));
await page.mouse.move(0,0); await page.waitForTimeout(300);
await page.focus('#contact-contact-message'); await page.keyboard.press('Tab'); await page.waitForTimeout(400);
log('focused after message tab =', await page.evaluate(() => document.activeElement.outerHTML.slice(0,60)));
log('submit focus', await st('button[type=submit]'), 'before', await st('button[type=submit]','::before'));
await page.locator('button[type=submit]').screenshot({ path: OUT+'shots/submit-focus.png' });
// Reset values
await page.reload({ waitUntil:'load' }); await page.waitForTimeout(1500);
// submit empty: count network requests to contact endpoint
let posts = 0; page.on('request', r => { if (r.url().includes('/contact') && r.method()==='POST') posts++; });
await page.click('button[type=submit]'); await page.waitForTimeout(800);
const after = await page.evaluate(() => ({ focus: document.activeElement.id, msgs: [...document.querySelectorAll('form input, form textarea, form select')].map(e => `${e.name}: valid=${e.validity.valid} msg="${e.validationMessage}" aria-invalid=${e.getAttribute('aria-invalid')} userInvalid=${e.matches(':user-invalid')}`), status: document.querySelector('[role=status]').textContent, listOpen: !!document.querySelector('[role=listbox]') }));
log('submit empty ->', JSON.stringify(after, null, 1), 'POSTs', posts);
const cdp = await c.newCDPSession(page);
const ax = await cdp.send('Accessibility.getFullAXTree');
for (const n of ax.nodes) { const nm = n.name?.value; if (['Your name','Email address','Your message','What brings you here?'].some(x => nm?.startsWith(x))) log('AX', n.role?.value, JSON.stringify(nm), (n.properties||[]).filter(p=>['invalid','required','focused','expanded'].includes(p.name)).map(p=>p.name+'='+JSON.stringify(p.value.value)).join(' '), 'desc=', n.description?.value||''); }
await page.screenshot({ path: OUT+'shots/submit-empty.png', fullPage:false });
// Simulate server-side invalid rendering? Not possible without POST. Inspect styling rule only.
await browser.close();
