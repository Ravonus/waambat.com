// Does the press burst's clip-path swallow link activation? Press a link for a realistic duration and see if it navigates.
import { chromium, base, save, settle } from './lib.mjs';
const b = await chromium.launch(); const R = { touchMenu: [], mouseNav: [], touchMenuReduced: [] };
async function touchRun(hold, fy, reduced = false) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: reduced ? 'reduce' : 'no-preference' }); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await p.goto(base + '/mechanics'); await settle(p, 1200);
  await p.locator('header button[aria-label="Menu"]').tap(); await p.waitForTimeout(1000);
  const bb = await p.locator('#mobile-site-menu nav a', { hasText: 'bio' }).boundingBox();
  const x = bb.x + bb.width * 0.5, y = bb.y + bb.height * fy;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await p.waitForTimeout(hold);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(1200);
  const url = await p.evaluate(() => location.pathname); await ctx.close();
  return { hold, fy, navigated: url === '/bio-waambat' };
}
async function mouseRun(hold, fy) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  await p.goto(base + '/mechanics'); await settle(p, 1200);
  const bb = await p.locator('header nav a', { hasText: 'bio' }).boundingBox();
  const x = bb.x + bb.width * 0.5, y = bb.y + bb.height * fy;
  // arrive from below so hover is settled first
  await p.mouse.move(x, y + 60); await p.waitForTimeout(200); await p.mouse.move(x, y); await p.waitForTimeout(600);
  await p.mouse.down(); await p.waitForTimeout(hold); await p.mouse.up();
  await p.waitForTimeout(1200);
  const url = await p.evaluate(() => location.pathname); await ctx.close();
  return { hold, fy, navigated: url === '/bio-waambat' };
}
for (const hold of (process.env.LITE ? [60, 100, 130] : [20, 60, 100, 130, 180, 300])) for (const fy of [0.3, 0.5, 0.75]) { R.touchMenu.push(await touchRun(hold, fy)); R.mouseNav.push(await mouseRun(hold, fy)); }
for (const hold of [100, 130]) R.touchMenuReduced.push(await touchRun(hold, 0.5, true));
save('taphold.json', R);
for (const k of Object.keys(R)) console.log(k, R[k].map(r => `${r.hold}ms@${r.fy}:${r.navigated ? 'ok' : 'FAIL'}`).join(' '));
await b.close();
