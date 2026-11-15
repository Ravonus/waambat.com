// Follow-ups: calm-mode close, pointer-click arrival focus, 200% zoom destination.
import { chromium, base, shots, save, settle } from './lib.mjs';
const b = await chromium.launch(); const R = {};
// 1. calm: close by X, Escape and destination
for (const how of ['x', 'escape', 'destination']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  await p.goto(base + '/mechanics'); await settle(p, 1500);
  await p.evaluate(() => document.querySelector('.site-theme').dataset.motion = 'calm');
  await p.locator('header button[aria-label="Menu"]').tap(); await p.waitForTimeout(800);
  if (how === 'x') await p.locator('button[aria-label="Close menu"]').tap();
  if (how === 'escape') await p.keyboard.press('Escape');
  if (how === 'destination') await p.locator('#mobile-site-menu nav a', { hasText: 'bio' }).tap();
  await p.waitForTimeout(1500);
  R['calm-' + how] = await p.evaluate(() => { const d = document.querySelector('#mobile-site-menu'); const mb = document.querySelector('header button[aria-label="Menu"]'); return { url: location.pathname, menuInDom: !!d, phase: d?.dataset.phase ?? null, overlayOpacity: d && getComputedStyle(d).opacity, menuButtonVisibility: getComputedStyle(mb).visibility, expanded: mb.getAttribute('aria-expanded'), inert: [...document.querySelectorAll('[inert]')].map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '')), htmlOverflow: getComputedStyle(document.documentElement).overflow, focus: document.activeElement?.tagName }; });
  // can the visitor still use the page? try tapping a main link
  R['calm-' + how].mainLinkHit = await p.evaluate(() => { const a = document.querySelector('main a'); if (!a) return null; const r = a.getBoundingClientRect(); const h = document.elementFromPoint(r.x + 3, r.y + 3); return h ? h.tagName + '.' + (h.className || '').toString().slice(0, 30) : null; });
  await p.screenshot({ path: shots + `calm-stuck-${how}.png` });
  await ctx.close();
}
// 2. pointer click arrival focus (fine pointer, 390 and 200% zoom)
for (const [label, opts] of [['fine390', { viewport: { width: 390, height: 844 } }], ['z200', { viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 }]]) {
  const runs = [];
  for (let i = 0; i < 3; i++) {
    const ctx = await b.newContext(opts); const p = await ctx.newPage(); await p.goto(base + '/mechanics'); await settle(p, 1500);
    await p.locator('header button[aria-label="Menu"]').click(); await p.waitForTimeout(900);
    await p.locator('#mobile-site-menu nav a', { hasText: 'bio' }).click(); await p.waitForTimeout(1500);
    runs.push(await p.evaluate(() => ({ url: location.pathname, focus: document.activeElement.tagName + (document.activeElement.id ? '#' + document.activeElement.id : ''), menu: !!document.querySelector('#mobile-site-menu'), overflow: getComputedStyle(document.documentElement).overflow })));
    await ctx.close();
  }
  R['clickArrival-' + label] = runs;
}
save('followup.json', R); console.log(JSON.stringify(R, null, 1)); await b.close();
