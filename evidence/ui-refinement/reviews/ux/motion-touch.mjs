import { chromium, base, shot, watchConsole, log } from './lib.mjs';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch();
const res = {};
// Reduced motion, desktop
{
  const c = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await c.newPage(); watchConsole(page, 'rm');
  await page.goto(base + '/contact-waambat', { waitUntil: 'load' }); await page.waitForTimeout(1500);
  await page.mouse.move(400, 400); await page.waitForTimeout(200);
  res.rmCursor = await page.evaluate(() => getComputedStyle(document.querySelector('.waambat-cursor span')).animationName);
  const link = page.locator('header nav a').nth(3);
  res.rmLink = await link.evaluate(a => ({ transition: getComputedStyle(a).transitionDuration, spinner: getComputedStyle(a.querySelector('span')).animationName }));
  res.rmInline = await page.evaluate(() => { const a = document.querySelector('.source-inline-link'); return a ? getComputedStyle(a).transitionDuration : 'none-on-page'; });
  res.rmForm = await page.evaluate(() => { const f = document.querySelector('[class*=floatingLabel]'); const s = document.querySelector('button[type=submit]'); return { label: getComputedStyle(f).transitionDuration, submitBefore: getComputedStyle(s, '::before').transitionDuration }; });
  // pending link spinner under reduced motion
  await page.route('**/*', async r => { if (['fetch','xhr'].includes(r.request().resourceType())) await new Promise(x => setTimeout(x, 1500)); await r.continue(); });
  await link.click({ noWaitAfter: true }); await page.waitForTimeout(300);
  res.rmPending = await link.evaluate(a => ({ pending: a.hasAttribute('data-pending'), spin: getComputedStyle(a.querySelector('span')).animationName, opacity: getComputedStyle(a.querySelector('span')).opacity, progress: [...document.querySelectorAll('[class*=progress] *, [class*=progress]')].map(e => getComputedStyle(e).animationName).join(',') }));
  await page.waitForTimeout(2000);
  await c.close();
}
// Reduced motion, mobile menu
{
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', hasTouch: true, isMobile: true });
  const page = await c.newPage(); watchConsole(page, 'rm-mobile');
  await page.goto(base + '/', { waitUntil: 'load' }); await page.waitForTimeout(1500);
  await page.locator('button[aria-label="Menu"]').tap(); await page.waitForTimeout(100);
  res.rmMenu = await page.evaluate(() => { const d = document.querySelector('#mobile-site-menu'); return { anim: getComputedStyle(d).animationName, dur: getComputedStyle(d).animationDuration }; });
  await page.locator('button[aria-label="Close menu"]').tap(); await page.waitForTimeout(150);
  res.rmMenuClosed = await page.evaluate(() => !document.querySelector('#mobile-site-menu'));
  res.touchCursor = await page.evaluate(() => ({ display: getComputedStyle(document.querySelector('.waambat-cursor')).display, root: document.documentElement.dataset.waambatCursor || null, bodyCursor: getComputedStyle(document.body).cursor }));
  await c.close();
}
// Desktop (fine pointer) but touch input events: the cursor must step aside
{
  const c = await b.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true });
  const page = await c.newPage();
  await page.goto(base + '/contact-waambat', { waitUntil: 'load' }); await page.waitForTimeout(1500);
  await page.mouse.move(300, 300); await page.waitForTimeout(150);
  res.hybridMouse = await page.evaluate(() => ({ op: document.querySelector('.waambat-cursor').style.opacity, root: document.documentElement.dataset.waambatCursor || null }));
  await page.touchscreen.tap(400, 400); await page.waitForTimeout(200);
  res.hybridAfterTouch = await page.evaluate(() => ({ op: document.querySelector('.waambat-cursor').style.opacity, root: document.documentElement.dataset.waambatCursor || null }));
  // drag an image: cursor hides during native drag
  await page.goto(base + '/', { waitUntil: 'load' }); await page.waitForTimeout(1500);
  const img = page.locator('main img').first(); await img.scrollIntoViewIfNeeded(); const bb = await img.boundingBox();
  await page.mouse.move(bb.x + 50, bb.y + 50); await page.waitForTimeout(100);
  res.overArt = await page.evaluate(() => ({ state: document.querySelector('.waambat-cursor').dataset.cursorState, op: document.querySelector('.waambat-cursor').style.opacity }));
  await shot(page, 'cursor-over-art', { clip: { x: bb.x, y: bb.y, width: 120, height: 120 } });
  await page.mouse.down(); await page.mouse.move(bb.x + 120, bb.y + 140, { steps: 8 }); await page.waitForTimeout(150);
  res.duringDrag = await page.evaluate(() => ({ state: document.querySelector('.waambat-cursor').dataset.cursorState, op: document.querySelector('.waambat-cursor').style.opacity, root: document.documentElement.dataset.waambatCursor || null }));
  await page.mouse.up(); await page.waitForTimeout(200);
  res.afterDrag = await page.evaluate(() => ({ state: document.querySelector('.waambat-cursor').dataset.cursorState, op: document.querySelector('.waambat-cursor').style.opacity }));
  // canvas scrollbar hover/drag colours
  const rail = page.locator('.waambat-scroll-rail'); 
  if (await rail.count()) { const rb = await rail.boundingBox(); await page.mouse.move(rb.x + 7, rb.y + 30); await page.waitForTimeout(250); res.railCursor = await page.evaluate(() => document.querySelector('.waambat-cursor').dataset.cursorState); await shot(page, 'scroll-rail-hover', { clip: { x: rb.x - 40, y: rb.y, width: 60, height: 200 } }); await page.mouse.down(); await page.mouse.move(rb.x + 7, rb.y + 200, { steps: 6 }); await page.waitForTimeout(150); res.railDragCursor = await page.evaluate(() => ({ s: document.querySelector('.waambat-cursor').dataset.cursorState, y: scrollY })); await shot(page, 'scroll-rail-drag', { clip: { x: rb.x - 40, y: rb.y, width: 60, height: 400 } }); await page.mouse.up(); }
  await c.close();
}
res.log = log;
writeFileSync(new URL('./motion-touch.json', import.meta.url), JSON.stringify(res, null, 2));
console.log(JSON.stringify(res, null, 2));
await b.close();
