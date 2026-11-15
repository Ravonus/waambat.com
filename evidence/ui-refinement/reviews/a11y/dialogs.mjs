import { chromium, BASE, OUT } from './common.mjs';
const browser = await chromium.launch();
const act = () => { const e = document.activeElement; return e === document.body ? 'BODY' : `${e.tagName.toLowerCase()} "${(e.getAttribute('aria-label')||e.textContent).trim().slice(0,40)}"`; };
const log = console.log;
// 1. Mobile menu at 390
{
  const c = await browser.newContext({ viewport:{width:390,height:844}, colorScheme:'dark', reducedMotion:'no-preference', isMobile:true, hasTouch:true });
  const page = await c.newPage();
  await page.goto(BASE+'/bio-waambat', { waitUntil:'load' }); await page.waitForTimeout(2000);
  await page.focus('button[aria-label=Menu]');
  await page.keyboard.press('Enter'); await page.waitForTimeout(600);
  log('menu open: focus=', await page.evaluate(act), 'expanded=', await page.getAttribute('button[aria-label=Menu]','aria-expanded'));
  const close = await page.evaluate(() => { const b = document.querySelector('button[aria-label="Close menu"]'); const s = getComputedStyle(b); const r = b.getBoundingClientRect(); return { color:s.color, outline:`${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`, size:[r.width,r.height] }; });
  log('close button', JSON.stringify(close));
  await page.screenshot({ path: OUT+'shots/menu-open-390.png' });
  const seq = []; for (let i=0;i<14;i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(80); seq.push(await page.evaluate(act)); }
  log('menu tab cycle:', seq.join(' -> '));
  const seqB = []; for (let i=0;i<3;i++) { await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(80); seqB.push(await page.evaluate(act)); }
  log('menu shift-tab:', seqB.join(' -> '));
  // link styles in menu
  log('menu links', await page.evaluate(() => [...document.querySelectorAll('#mobile-site-menu a')].map(a => { const s = getComputedStyle(a); const r = a.getBoundingClientRect(); return `${a.textContent.trim()} ${s.color} ${Math.round(r.width)}x${Math.round(r.height)} cur=${a.getAttribute('aria-current')}`; }).join(' | ')));
  await page.keyboard.press('Escape'); await page.waitForTimeout(700);
  log('after Escape: dialog=', await page.evaluate(() => !!document.querySelector('#mobile-site-menu')), 'focus=', await page.evaluate(act), 'expanded=', await page.getAttribute('button[aria-label=Menu]','aria-expanded'));
  log('Menu button focus ring', await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`; }));
  // open, navigate via menu link with keyboard
  await page.keyboard.press('Enter'); await page.waitForTimeout(600);
  await page.locator('#mobile-site-menu a', { hasText: 'instagram' }).focus();
  await page.keyboard.press('Enter'); await page.waitForTimeout(2500);
  log('after menu navigation: url=', page.url(), 'focus=', await page.evaluate(act), 'menu present=', await page.evaluate(() => !!document.querySelector('#mobile-site-menu')), 'scroll lock=', await page.evaluate(() => document.body.style.position + '/' + document.documentElement.style.overflow));
  await c.close();
}
// 2. Archive viewer
{
  const c = await browser.newContext({ viewport:{width:1440,height:900}, colorScheme:'dark', reducedMotion:'reduce' });
  const page = await c.newPage();
  await page.goto(BASE+'/art-by-waambat', { waitUntil:'load' }); await page.waitForTimeout(2000);
  const btn = page.locator('button.archive-expand').first();
  await btn.focus(); const label = await btn.getAttribute('aria-label');
  await page.keyboard.press('Enter'); await page.waitForTimeout(800);
  log('archive viewer open:', await page.evaluate(() => document.querySelector('dialog.archive-viewer').open), 'focus=', await page.evaluate(act));
  const seq = []; for (let i=0;i<6;i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(80); seq.push(await page.evaluate(act) + ' ring=' + await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle==='none'?'NONE':`${s.outlineWidth} ${s.outlineColor}`; })); }
  log('viewer tab:', seq.join(' -> '));
  log('viewer buttons', await page.evaluate(() => [...document.querySelectorAll('dialog.archive-viewer button')].map(b => { const r = b.getBoundingClientRect(); const s = getComputedStyle(b); return `${(b.getAttribute('aria-label')||b.textContent).trim()} ${Math.round(r.width)}x${Math.round(r.height)} ${s.color}`; }).join(' | ')));
  await page.screenshot({ path: OUT+'shots/archive-viewer.png' });
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  log('after Escape: open=', await page.evaluate(() => document.querySelector('dialog.archive-viewer').open), 'focus=', await page.evaluate(act), 'expected', label);
  await c.close();
}
// 3. Save dialog via contextmenu on an image (no Save click)
{
  const c = await browser.newContext({ viewport:{width:1440,height:900}, colorScheme:'dark', reducedMotion:'reduce', acceptDownloads:false });
  const page = await c.newPage();
  await page.goto(BASE+'/bio-waambat', { waitUntil:'load' }); await page.waitForTimeout(2000);
  const img = page.locator('main img').first();
  await img.scrollIntoViewIfNeeded();
  // focus a nearby element first so we can check return focus
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  const before = await page.evaluate(act);
  await img.click({ button:'right' }); await page.waitForTimeout(400);
  const progress = await page.evaluate(() => { const d = document.querySelector('.waambat-download'); return { open: d.open, h2: d.querySelector('h2').textContent, status: d.querySelector('[role=status]')?.textContent, alert: d.querySelector('[role=alert]')?.textContent }; });
  log('save dialog (early):', JSON.stringify(progress), 'focus=', await page.evaluate(act));
  await page.waitForTimeout(3000);
  const ready = await page.evaluate(() => { const d = document.querySelector('.waambat-download'); const g = (sel) => { const e = d.querySelector(sel); if (!e) return null; const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return `${s.color} on ${s.backgroundColor} ${Math.round(r.width)}x${Math.round(r.height)} fs=${s.fontSize}`; }; return { h2: d.querySelector('h2').textContent, alert: d.querySelector('[role=alert]')?.textContent, dialogBg: getComputedStyle(d).backgroundColor, border: getComputedStyle(d).borderTopColor, close: g('.waambat-download-close'), kicker: g('.waambat-download-kicker'), save: g('.waambat-download-save'), cancel: g('.waambat-download-cancel'), info: g('.waambat-download-info'), copy: g('.waambat-download-copy') }; });
  log('save dialog (ready):', JSON.stringify(ready, null, 1));
  await page.screenshot({ path: OUT+'shots/save-dialog-ready.png' });
  const seq = []; for (let i=0;i<4;i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(80); seq.push(await page.evaluate(act) + ' ring=' + await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle==='none'?'NONE':`${s.outlineWidth} ${s.outlineColor} off ${s.outlineOffset}`; })); }
  log('save dialog tab:', seq.join(' -> '));
  // focus Save link and screenshot ring
  const save = page.locator('.waambat-download-save');
  if (await save.count()) { await save.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await page.waitForTimeout(200); await page.locator('.waambat-download').screenshot({ path: OUT+'shots/save-dialog-save-focus.png' }); await save.hover(); await page.waitForTimeout(300); log('save hover', await save.evaluate(e => { const s = getComputedStyle(e); return s.color + ' on ' + s.backgroundColor; })); }
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  log('after Escape: open=', await page.evaluate(() => document.querySelector('.waambat-download').open), 'focus=', await page.evaluate(act), 'before was', before);
  await c.close();
}
await browser.close();
