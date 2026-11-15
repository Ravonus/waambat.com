// Mobile menu: open/close by X, Escape and link under motion full/calm/off/reduced; state after close; hamburger centring.
import { chromium, guard, go, save, shots, sharp } from './lib.mjs';
const b = await chromium.launch(); const R = { close: [], centre: [], frames: {} };
const state = p => p.evaluate(() => {
  const d = document.getElementById('mobile-site-menu'), btn = document.querySelector('header button[aria-label="Menu"]');
  return { path: location.pathname, phase: d?.dataset.phase, open: d?.open, expanded: btn?.getAttribute('aria-expanded'), btnVis: btn ? getComputedStyle(btn).visibility : null, inert: !!document.querySelector('main[inert], #main-content[inert], footer[inert]'), htmlOverflow: getComputedStyle(document.documentElement).overflow, bodyOverflow: getComputedStyle(document.body).overflow, focus: document.activeElement?.getAttribute('aria-label') || document.activeElement?.id || document.activeElement?.tagName };
});
async function run(motion, how) {
  const reduced = motion === 'reduced';
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, colorScheme: 'dark', reducedMotion: reduced ? 'reduce' : 'no-preference' }); await guard(ctx);
  const p = await ctx.newPage(); await go(p, '/mechanics', 1500);
  if (!reduced) await p.evaluate(m => document.querySelectorAll('.site-theme').forEach(e => { e.dataset.motion = m; }), motion);
  await p.locator('header button[aria-label="Menu"]').tap();
  await p.waitForTimeout(700);
  const opened = await state(p);
  const t0 = Date.now();
  if (how === 'x') await p.locator('button[aria-label="Close menu"]').tap();
  else if (how === 'esc') await p.keyboard.press('Escape');
  else await p.locator('#mobile-site-menu nav a', { hasText: 'bio' }).tap();
  let closedAt = null, s;
  for (let i = 0; i < 40; i++) { await p.waitForTimeout(50); s = await state(p); if (s.phase === 'closed' || (!s.open && s.phase !== 'closing' && s.phase !== 'open')) { closedAt = Date.now() - t0; break; } }
  await p.waitForTimeout(400); s = await state(p);
  const usable = !s.inert && s.expanded === 'false' && s.btnVis === 'visible' && s.htmlOverflow !== 'hidden' && s.bodyOverflow !== 'hidden';
  R.close.push({ motion, how, opened: { phase: opened.phase, focus: opened.focus, inert: opened.inert }, closedAtMs: closedAt, after: s, usable });
  await ctx.close();
}
for (const motion of ['full', 'calm', 'off', 'reduced']) for (const how of ['x', 'esc', 'link']) await run(motion, how);
// Animation frames for full open and close (visual)
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, colorScheme: 'dark' }); await guard(ctx);
  const p = await ctx.newPage(); await go(p, '/bio-waambat', 1500);
  await p.screenshot({ path: shots + 'menu-closed-390.png' });
  await p.locator('header button[aria-label="Menu"]').tap();
  const frames = [];
  for (const t of [60, 140, 240, 360, 900]) { await p.waitForTimeout(t - (frames.at(-1)?.t ?? 0)); const f = `menu-open-${t}ms.png`; await p.screenshot({ path: shots + f }); frames.push({ t, f }); }
  R.frames.open = frames;
  // link colours in menu
  R.menuColors = await p.evaluate(() => [...document.querySelectorAll('#mobile-site-menu nav a')].map(a => ({ t: a.textContent.trim(), c: getComputedStyle(a).color, cur: a.getAttribute('aria-current'), idx: getComputedStyle(a.querySelector('span')).color, h: Math.round(a.getBoundingClientRect().height) })));
  R.closeBtn = await p.evaluate(() => { const c = document.querySelector('button[aria-label="Close menu"]'); const r = c.getBoundingClientRect(); return { box: [r.x, r.y, r.width, r.height], color: getComputedStyle(c).color }; });
  await p.locator('button[aria-label="Close menu"]').tap();
  const cf = [];
  for (const t of [50, 150, 260, 600]) { await p.waitForTimeout(t - (cf.at(-1)?.t ?? 0)); const f = `menu-close-${t}ms.png`; await p.screenshot({ path: shots + f }); cf.push({ t, f }); }
  R.frames.close = cf;
  await ctx.close();
  const files = [...frames.map(x => x.f), ...cf.map(x => x.f)];
  const W = 195, H = 422;
  const comps = await Promise.all(files.map(async (f, i) => ({ input: await sharp(shots + f).resize(W, H).toBuffer(), left: i * (W + 6), top: 0 })));
  await sharp({ create: { width: files.length * (W + 6), height: H, channels: 3, background: '#444' } }).composite(comps).png().toFile(shots + 'sheet-menu-open-close.png');
}
// Hamburger centre vs wordmark ink
for (const [w, h, path] of [[360, 800, '/'], [390, 844, '/'], [700, 1000, '/'], [390, 844, '/bio-waambat'], [360, 800, '/contact-waambat'], [700, 1000, '/mechanics']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, colorScheme: 'dark', reducedMotion: 'reduce' }); await guard(ctx);
  const p = await ctx.newPage(); await go(p, path, 1500);
  const btn = await p.locator('header button[aria-label="Menu"]').boundingBox();
  // Wordmark ink: scan screenshot for logo-pink pixels in the left 75% of the top 200px
  const buf = await p.screenshot({ clip: { x: 0, y: 0, width: Math.round(w * 0.8), height: 220 } });
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  let top = 1e9, bot = -1; const dpr = info.width / Math.round(w * 0.8);
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) { const i = (y * info.width + x) * info.channels; const r = data[i], g = data[i + 1], bl = data[i + 2]; if (r > 220 && g > 120 && g < 175 && bl > 150 && bl < 205) { if (y < top) top = y; if (y > bot) bot = y; } }
  const ink = bot >= 0 ? { top: top / dpr, bottom: bot / dpr, centre: (top + bot) / 2 / dpr } : null;
  const bc = btn ? btn.y + btn.height / 2 : null;
  R.centre.push({ w, path, button: btn && [btn.x, btn.y, btn.width, btn.height].map(v => +v.toFixed(1)), buttonCentre: bc && +bc.toFixed(1), ink, delta: ink && bc ? +(bc - ink.centre).toFixed(1) : null });
  await p.screenshot({ path: `${shots}centre-${w}-${path === '/' ? 'home' : path.slice(1)}.png`, clip: { x: 0, y: 0, width: w, height: 160 } });
  await ctx.close();
}
save(process.env.SUFFIX ? 'menu'+process.env.SUFFIX+'.json' : 'menu.json', R);
for (const c of R.close) console.log(c.motion.padEnd(8), c.how.padEnd(5), 'closedAt', c.closedAtMs, 'usable', c.usable, 'path', c.after.path, 'focus', c.after.focus, 'openFocus', c.opened.focus);
console.log(JSON.stringify(R.centre));
console.log(JSON.stringify(R.menuColors), JSON.stringify(R.closeBtn));
await b.close();
