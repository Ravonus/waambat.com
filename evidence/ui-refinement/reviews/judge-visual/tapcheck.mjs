// Re-check the one failed mouse press (desktop nav "bio", 100ms hold at 75% height): repeat it and record where the click landed.
import { chromium, guard, go, save } from './lib.mjs';
const b = await chromium.launch(); const R = [];
async function once(hold, fy) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' }); await guard(ctx);
  const p = await ctx.newPage(); await go(p, '/mechanics', 1500);
  await p.evaluate(() => { window.__ev = []; for (const t of ['pointerdown', 'pointerup', 'click']) addEventListener(t, e => window.__ev.push(t + ':' + (e.target.closest?.('a')?.textContent?.trim() || e.target.tagName)), true); });
  const bb = await p.locator('header nav a', { hasText: 'bio' }).boundingBox();
  const x = bb.x + bb.width * 0.5, y = bb.y + bb.height * fy;
  await p.mouse.move(x, y + 60); await p.waitForTimeout(150); await p.mouse.move(x, y); await p.waitForTimeout(120);
  await p.mouse.down(); await p.waitForTimeout(hold); await p.mouse.up();
  const ev = await p.evaluate(() => window.__ev).catch(() => ['(navigated)']);
  await p.waitForTimeout(1300);
  const url = await p.evaluate(() => location.pathname); await ctx.close();
  return { hold, fy, ok: url === '/bio-waambat', box: [bb.y, bb.height].map(v => +v.toFixed(1)), y: +y.toFixed(1), ev };
}
for (let i = 0; i < 8; i++) R.push(await once(100, 0.75));
for (const hold of [60, 130]) for (let i = 0; i < 3; i++) R.push(await once(hold, 0.75));
for (let i = 0; i < 3; i++) R.push(await once(100, 0.5));
save('tapcheck.json', R);
console.log(R.filter(r => r.ok).length + '/' + R.length, JSON.stringify(R.filter(r => !r.ok)));
await b.close();
