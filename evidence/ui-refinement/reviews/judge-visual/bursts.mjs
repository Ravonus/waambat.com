// (A) Do hover bursts fire once and stop? Count mosh animationstart events with the pointer parked for 2.5s.
// (B) Do quick presses/taps land? 60/100/130ms holds at 30/50/75% of link height, touch and mouse.
import { chromium, guard, go, save, shots } from './lib.mjs';
const b = await chromium.launch(); const R = { hover: {}, taps: [], keys: [] };
const init = () => { window.__starts = []; addEventListener('animationstart', e => { if (/mosh/.test(e.animationName)) window.__starts.push([Math.round(performance.now()), e.animationName, e.target.className?.toString().slice(0, 30)]); }, true); };
async function hover(opts, path, sel, label, idx = 0, prep) {
  const ctx = await b.newContext({ colorScheme: 'dark', ...opts }); await guard(ctx);
  const page = await ctx.newPage(); await page.addInitScript(init); await go(page, path, 1800);
  if (prep) await prep(page);
  const loc = page.locator(sel).nth(idx);
  if (!(await loc.count())) { R.hover[label] = 'not found'; await ctx.close(); return; }
  await loc.scrollIntoViewIfNeeded(); await page.waitForTimeout(900);
  const bb = await loc.boundingBox(); const res = {}; const anim = {};
  for (const f of [0.15, 0.5, 0.85]) {
    await page.mouse.move(bb.x - 40 > 0 ? bb.x - 40 : bb.x + bb.width + 40, bb.y + bb.height + 60); await page.waitForTimeout(400);
    await page.evaluate(() => { window.__starts = []; });
    await page.mouse.move(bb.x + bb.width * 0.45, bb.y + bb.height * f);
    if (f === 0.5) { await page.waitForTimeout(60); await page.screenshot({ path: `${shots}burst-${label}-60ms.png`, clip: { x: Math.max(0, bb.x - 16), y: Math.max(0, bb.y - 16), width: bb.width + 32, height: bb.height + 32 } }); await page.waitForTimeout(2440); await page.screenshot({ path: `${shots}burst-${label}-2500ms.png`, clip: { x: Math.max(0, bb.x - 16), y: Math.max(0, bb.y - 16), width: bb.width + 32, height: bb.height + 32 } }); }
    else await page.waitForTimeout(2500);
    res['y' + f] = (await page.evaluate(() => window.__starts)).length;
    anim['y' + f] = await loc.evaluate(e => e.getAnimations({ subtree: true }).filter(a => /mosh/.test(a.animationName)).map(a => a.playState));
  }
  R.hover[label] = { starts: res, runningAfter2500: anim };
  await ctx.close();
}
const desk = { viewport: { width: 1440, height: 900 } };
const openMenu = async page => { await page.locator('header button[aria-label="Menu"]').click(); await page.waitForTimeout(1100); };
await hover(desk, '/contact-waambat', 'header nav a', 'desk-nav', 3);
await hover(desk, '/contact-waambat', 'header nav a[aria-current=page]', 'desk-nav-current');
await hover(desk, '/contact-waambat', 'a.site-logo', 'wordmark');
await hover(desk, '/', '.original-artwork .artwork-caption h2 a', 'caption-title');
await hover(desk, '/instagram', '.source-inline-link', 'inline-link');
await hover(desk, '/', '.media-control', 'media-control');
await hover({ viewport: { width: 390, height: 844 } }, '/mechanics', '#mobile-site-menu nav a', 'menu-link-fine390', 2, openMenu);
await hover({ viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 }, '/mechanics', '#mobile-site-menu nav a', 'menu-link-zoom200', 4, openMenu);
await hover({ ...desk, reducedMotion: 'reduce' }, '/contact-waambat', 'header nav a', 'desk-nav-reduced', 3);
console.log(JSON.stringify(R.hover));

async function touchTap(hold, fy, motion = 'no-preference') {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, colorScheme: 'dark', reducedMotion: motion }); await guard(ctx);
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await go(p, '/mechanics', 1500);
  await p.locator('header button[aria-label="Menu"]').tap(); await p.waitForTimeout(1000);
  const bb = await p.locator('#mobile-site-menu nav a', { hasText: 'bio' }).boundingBox();
  const x = bb.x + bb.width * 0.5, y = bb.y + bb.height * fy;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await p.waitForTimeout(hold);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(1300);
  const url = await p.evaluate(() => location.pathname); await ctx.close();
  return { kind: 'touch-menu', motion, hold, fy, ok: url === '/bio-waambat' };
}
async function touchNav768(hold, fy) {
  const ctx = await b.newContext({ viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true, colorScheme: 'dark' }); await guard(ctx);
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await go(p, '/mechanics', 1500);
  const bb = await p.locator('header nav a', { hasText: 'bio' }).first().boundingBox();
  if (!bb) { await ctx.close(); return { kind: 'touch-nav768', hold, fy, ok: 'no nav' }; }
  const x = bb.x + bb.width * 0.5, y = bb.y + bb.height * fy;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await p.waitForTimeout(hold);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(1300);
  const url = await p.evaluate(() => location.pathname); await ctx.close();
  return { kind: 'touch-nav768', hold, fy, ok: url === '/bio-waambat' };
}
async function mousePress(hold, fy) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' }); await guard(ctx);
  const p = await ctx.newPage(); await go(p, '/mechanics', 1500);
  const bb = await p.locator('header nav a', { hasText: 'bio' }).boundingBox();
  const x = bb.x + bb.width * 0.5, y = bb.y + bb.height * fy;
  await p.mouse.move(x, y + 60); await p.waitForTimeout(150); await p.mouse.move(x, y); await p.waitForTimeout(120);
  await p.mouse.down(); await p.waitForTimeout(hold); await p.mouse.up();
  await p.waitForTimeout(1300);
  const url = await p.evaluate(() => location.pathname); await ctx.close();
  return { kind: 'mouse-nav', hold, fy, ok: url === '/bio-waambat' };
}
for (const hold of [60, 100, 130]) for (const fy of [0.3, 0.5, 0.75]) { R.taps.push(await touchTap(hold, fy)); R.taps.push(await mousePress(hold, fy)); R.taps.push(await touchNav768(hold, fy)); }
for (const hold of [80, 120]) R.taps.push(await touchTap(hold, 0.5, 'reduce'));
// Keyboard: Enter on a nav link, Enter on menu link
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' }); await guard(ctx);
  const p = await ctx.newPage(); await go(p, '/mechanics', 1500);
  await p.locator('header button[aria-label="Menu"]').focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(900);
  const focused = await p.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  for (let i = 0; i < 8; i++) { await p.keyboard.press('Tab'); const t = await p.evaluate(() => document.activeElement?.textContent?.trim()); if (/bio/.test(t || '')) break; }
  await p.keyboard.press('Enter'); await p.waitForTimeout(1400);
  R.keys.push({ firstFocus: focused, url: await p.evaluate(() => location.pathname), focusAfter: await p.evaluate(() => document.activeElement?.id || document.activeElement?.tagName) });
  await ctx.close();
}
save(process.env.SUFFIX ? 'bursts'+process.env.SUFFIX+'.json' : 'bursts.json', R);
const sum = {}; for (const t of R.taps) { const k = t.kind + (t.motion === 'reduce' ? '-reduced' : ''); sum[k] ??= [0, 0]; sum[k][0] += t.ok === true ? 1 : 0; sum[k][1]++; }
console.log('taps', JSON.stringify(sum), JSON.stringify(R.taps.filter(t => t.ok !== true)));
console.log('keys', JSON.stringify(R.keys));
await b.close();
