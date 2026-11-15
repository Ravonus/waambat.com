// prefers-reduced-motion: reduce (and the studio's calm/off settings, set on the live DOM for inspection only).
import { chromium, base, shots, save, guard, settle } from './lib.mjs';
const b = await chromium.launch();
const R = {};
const allAnims = page => page.evaluate(() => document.getAnimations().map(a => (a.animationName || a.transitionProperty || a.constructor.name) + (a.effect?.pseudoElement || '')));
async function desktop(label, opts, motion = null) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', ...opts }); await guard(ctx);
  const page = await ctx.newPage(); await page.goto(base + '/contact-waambat'); await settle(page, 1500);
  if (motion) await page.evaluate(m => document.querySelector('.site-theme').dataset.motion = m, motion);
  const S = R[label] = {};
  S.idleAnimations = await allAnims(page);
  await page.locator('header nav a').nth(3).hover(); await page.waitForTimeout(40);
  S.navHover = await page.evaluate(() => { const a = document.querySelectorAll('header nav a')[3]; const c = getComputedStyle(a); return { anims: a.getAnimations().map(x => x.animationName || 'transition:' + x.transitionProperty), clip: c.clipPath, shadow: c.textShadow, color: c.color }; });
  await page.screenshot({ path: shots + `reduced-${label}-nav-hover.png`, clip: { x: 250, y: 30, width: 940, height: 90 } });
  const field = page.locator('main input:not([type=hidden])').first(); await field.click(); await page.waitForTimeout(30);
  S.fieldFocus = await page.evaluate(() => { const f = document.activeElement.closest('[data-mosh-field]'); return f.getAnimations().map(a => a.animationName || 'transition:' + a.transitionProperty); });
  const sb = await page.locator('main button[type=submit]').boundingBox();
  await page.mouse.move(sb.x + 20, sb.y + 10); await page.waitForTimeout(200); await page.mouse.down(); await page.waitForTimeout(40);
  S.submitPress = await page.evaluate(() => { const s = document.querySelector('main button[type=submit]'); return { burst: s.hasAttribute('data-mosh-burst'), anims: s.getAnimations().map(a => a.animationName || 'transition:' + a.transitionProperty), filter: getComputedStyle(s).filter }; });
  S.cursorPressed = await page.evaluate(() => { const c = document.querySelector('.waambat-cursor'); const s = c?.querySelector('span'); return c && { pressed: c.hasAttribute('data-pressed'), anim: getComputedStyle(s).animationName, filter: getComputedStyle(s).filter }; });
  await page.mouse.move(sb.x + 20, sb.y - 300); await page.mouse.up();
  // rail drag
  const rail = await page.locator('.waambat-scroll-rail').boundingBox();
  if (rail) {
    await page.mouse.move(rail.x + 9, rail.y + 20); await page.waitForTimeout(200); await page.mouse.down(); await page.mouse.move(rail.x + 9, rail.y + 120, { steps: 6 }); await page.waitForTimeout(150);
    S.railDrag = await page.evaluate(() => { const cv = document.querySelector('.waambat-scroll-rail canvas'); const ctx = cv.getContext('2d'); const d = ctx.getImageData(0, 0, cv.width, cv.height).data; const W = cv.width, H = cv.height; const cols = {}; for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (d[i + 3] > 40) { const k = x; cols[k] = cols[k] || [d[i], d[i + 1], d[i + 2], d[i + 3]]; } } return { w: W, h: H, dpr: devicePixelRatio, columnsPainted: Object.keys(cols).map(Number), sample: cols }; });
    await page.screenshot({ path: shots + `reduced-${label}-rail-drag.png`, clip: { x: 1400, y: 0, width: 40, height: 400 } });
    await page.mouse.up();
  }
  await ctx.close();
}
await desktop('reduce', { reducedMotion: 'reduce' });
await desktop('control', { reducedMotion: 'no-preference' });
await desktop('calm', {}, 'calm');
await desktop('off', {}, 'off');
// Phone menu under reduce
for (const [label, opts, motion] of [['menu-reduce', { reducedMotion: 'reduce' }, null], ['menu-calm', {}, 'calm'], ['menu-off', {}, 'off']]) { try {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, colorScheme: 'dark', ...opts }); await guard(ctx);
  const page = await ctx.newPage(); await page.goto(base + '/mechanics'); await settle(page, 1500);
  if (motion) await page.evaluate(m => document.querySelector('.site-theme').dataset.motion = m, motion);
  const S = R[label] = {};
  await page.locator('header button[aria-label="Menu"]').tap(); await page.waitForTimeout(40);
  S.openAnimations = await allAnims(page);
  S.overlay = await page.evaluate(() => { const d = document.querySelector('#mobile-site-menu'); return { anim: getComputedStyle(d).animationName, dur: getComputedStyle(d).animationDuration, before: getComputedStyle(d, '::before').animationName, link: getComputedStyle(d.querySelector('nav a')).animationName, glyph: getComputedStyle(d.querySelector('path')).animationName, opacity: getComputedStyle(d).opacity }; });
  await page.screenshot({ path: shots + `reduced-${label}-open-40ms.png` });
  await page.waitForTimeout(600);
  const t0 = Date.now(); await page.locator('button[aria-label="Close menu"]').tap();
  let gone = null; for (let i = 0; i < 30; i++) { if (!(await page.evaluate(() => !!document.querySelector('#mobile-site-menu')))) { gone = Date.now() - t0; break; } await page.waitForTimeout(20); }
  S.closeXms = gone; S.stateAfterXTap = await page.evaluate(() => { const d = document.querySelector('#mobile-site-menu'); return d && { phase: d.dataset.phase, opacity: getComputedStyle(d).opacity, anim: getComputedStyle(d).animationName, pointer: getComputedStyle(d).pointerEvents, expanded: document.querySelector('header button[aria-label="Menu"]').getAttribute('aria-expanded'), menuVisible: getComputedStyle(document.querySelector('header button[aria-label="Menu"]')).visibility }; });
  await page.screenshot({ path: shots + `reduced-${label}-after-x-600ms.png` });
  if (gone === null) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); S.escapeWhileStuck = await page.evaluate(() => !!document.querySelector('#mobile-site-menu')); await page.goto(base + '/mechanics'); await settle(page, 1200); if (motion) await page.evaluate(m => document.querySelector('.site-theme').dataset.motion = m, motion); }
  S.afterX = await page.evaluate(() => ({ focus: document.activeElement.getAttribute('aria-label'), overflow: getComputedStyle(document.documentElement).overflow }));
  await page.locator('header button[aria-label="Menu"]').tap(); await page.waitForTimeout(300);
  const t1 = Date.now(); await page.keyboard.press('Escape');
  gone = null; for (let i = 0; i < 30; i++) { if (!(await page.evaluate(() => !!document.querySelector('#mobile-site-menu')))) { gone = Date.now() - t1; break; } await page.waitForTimeout(20); }
  S.escapeMs = gone;
  await page.locator('header button[aria-label="Menu"]').tap(); await page.waitForTimeout(300);
  const t2 = Date.now(); await page.locator('#mobile-site-menu nav a', { hasText: 'bio' }).tap();
  gone = null; for (let i = 0; i < 60; i++) { const s = await page.evaluate(() => [!!document.querySelector('#mobile-site-menu'), location.pathname]); if (!s[0] && s[1] !== '/mechanics') { gone = Date.now() - t2; break; } await page.waitForTimeout(20); }
  S.destinationMs = gone; S.afterDest = await page.evaluate(() => ({ url: location.pathname, focus: document.activeElement.tagName + '#' + document.activeElement.id, menu: document.querySelector('#mobile-site-menu')?.dataset.phase ?? 'gone' }));
  await page.screenshot({ path: shots + `reduced-${label}-after-destination.png` });
  await ctx.close();
 } catch (e) { R[label].error = String(e).slice(0, 200); }
}
save('reduced.json', R);
console.log(JSON.stringify(R, null, 1).slice(0, 6000));
await b.close();
