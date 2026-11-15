// Datamosh bursts at 1440 (fine pointer): trigger, timeline, frames, re-trigger, layout shift, keyboard replay in the menu.
import { chromium, base, shots, save, guard, watchConsole, settle } from './lib.mjs';
const R = {}; const consoleLog = []; const blocked = [];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' }); await guard(ctx, blocked);
const page = await ctx.newPage(); watchConsole(page, consoleLog, 'mosh');
await page.addInitScript(() => {
  window.__cls = 0; window.__starts = [];
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  addEventListener('animationstart', e => { if (/mosh|menu/.test(e.animationName)) window.__starts.push([Math.round(performance.now()), e.animationName, (e.target.textContent || e.target.className || '').toString().trim().slice(0, 20)]); }, true);
});
// sample computed styles of an element every animation frame for ms
const sample = (sel, ms, idx = 0) => page.evaluate(([sel, ms, idx]) => new Promise(res => {
  const el = document.querySelectorAll(sel)[idx]; const t0 = performance.now(); const out = []; const r0 = el.getBoundingClientRect();
  const tick = () => { const c = getComputedStyle(el); const r = el.getBoundingClientRect(); out.push([Math.round(performance.now() - t0), c.translate, c.clipPath, (c.textShadow || '').slice(0, 60), (c.filter || '').slice(0, 60), (c.boxShadow || '').slice(0, 50), Math.round(r.x - r0.x) + ',' + Math.round(r.y - r0.y)]); if (performance.now() - t0 < ms) requestAnimationFrame(tick); else res(out); };
  tick();
}), [sel, ms, idx]);
const animsOn = (sel, idx = 0) => page.evaluate(([sel, idx]) => document.querySelectorAll(sel)[idx]?.getAnimations().map(a => [a.animationName, a.playState, Math.round(a.currentTime ?? -1), a.effect.getTiming().duration, a.effect.getTiming().iterations]), [sel, idx]);
// Seek one element's mosh animation and capture frames
async function frames(sel, idx, name, clipPad = 12, times = [0, 40, 60, 100, 150, 200, 240, 300]) {
  const box = await page.evaluate(([sel, idx]) => { const r = document.querySelectorAll(sel)[idx].getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }, [sel, idx]);
  const clip = { x: Math.max(0, box[0] - clipPad), y: Math.max(0, box[1] - clipPad), width: box[2] + clipPad * 2, height: box[3] + clipPad * 2 };
  const files = [];
  for (const t of times) {
    const ok = await page.evaluate(([sel, idx, t]) => { const a = document.querySelectorAll(sel)[idx].getAnimations().find(a => /mosh/.test(a.animationName)); if (!a) return false; a.pause(); a.currentTime = t; return true; }, [sel, idx, t]);
    if (!ok) break;
    const f = shots + `mosh-${name}-${String(t).padStart(3, '0')}.png`; await page.screenshot({ path: f, clip }); files.push(f);
  }
  return { box, files };
}

// --- a. nav hover on /contact-waambat
await page.goto(base + '/contact-waambat'); await settle(page, 1500);
R.motionSetting = await page.evaluate(() => document.querySelector('.site-theme')?.dataset.motion);
const navSel = 'header nav a';
await page.locator(navSel).nth(3).hover();
R.navHoverSample = await sample(navSel, 360, 3);
R.navHoverAfter = await animsOn(navSel, 3);
await page.waitForTimeout(1500);
R.navHoverAfter2s = await animsOn(navSel, 3);
R.navHoverStyle = await page.evaluate(() => { const a = document.querySelectorAll('header nav a')[3]; const c = getComputedStyle(a); return { color: c.color, after: getComputedStyle(a, '::after').boxShadow }; });
// frames: re-hover and pause
await page.mouse.move(700, 600); await page.waitForTimeout(200); await page.locator(navSel).nth(3).hover();
R.navFrames = await frames(navSel, 3, 'nav-hover', 14);
await page.evaluate(() => document.getAnimations().forEach(a => { if (a.playState === 'paused') a.play(); }));
// sweep across all nav links quickly
await page.mouse.move(10, 600); await page.waitForTimeout(400);
await page.evaluate(() => { window.__starts = []; });
const navBoxes = await page.evaluate(() => [...document.querySelectorAll('header nav a')].map(a => { const r = a.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }));
for (const [x, y] of navBoxes) { await page.mouse.move(x, y, { steps: 3 }); await page.waitForTimeout(40); }
await page.screenshot({ path: shots + 'mosh-nav-sweep.png', clip: { x: 250, y: 30, width: 940, height: 90 } });
await page.waitForTimeout(400);
R.navSweepStarts = await page.evaluate(() => window.__starts);
// jiggle on one link: in/out 10 times in ~1s
await page.evaluate(() => { window.__starts = []; });
const [jx, jy] = navBoxes[2];
for (let i = 0; i < 10; i++) { await page.mouse.move(jx, jy); await page.waitForTimeout(45); await page.mouse.move(jx, jy + 40); await page.waitForTimeout(45); }
R.navJiggleStarts = (await page.evaluate(() => window.__starts)).length;
// --- b. keyboard focus burst
await page.mouse.move(10, 600);
await page.evaluate(() => document.activeElement?.blur());
await page.goto(base + '/contact-waambat'); await settle(page, 1200);
const kb = [];
for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(30); kb.push(await page.evaluate(() => { const a = document.activeElement; return [a.textContent.trim().slice(0, 20) || a.getAttribute('aria-label'), a.getAnimations().map(x => x.animationName).join(',')]; })); }
R.keyboardFocus = kb;
await page.screenshot({ path: shots + 'mosh-nav-focus.png', clip: { x: 250, y: 30, width: 940, height: 90 } });
// --- c. field focus tear
const field = page.locator('main input:not([type=hidden])').first();
await field.click(); await page.waitForTimeout(20);
R.fieldAnims = await page.evaluate(() => { const f = document.activeElement.closest('[data-mosh-field]'); return f ? f.getAnimations().map(a => [a.animationName, a.effect.getTiming().duration]) : null; });
R.fieldFrames = await frames('[data-mosh-field]', 0, 'field-focus', 14, [0, 50, 100, 150, 200, 280]);
await page.evaluate(() => document.getAnimations().forEach(a => { if (a.playState === 'paused') a.play(); }));
await page.waitForTimeout(500);
R.fieldSettled = await page.evaluate(() => { const f = document.querySelector('[data-mosh-field]'); const c = getComputedStyle(f); return { boxShadow: c.boxShadow, anims: f.getAnimations().map(a => a.animationName) }; });
await page.screenshot({ path: shots + 'mosh-field-settled.png', clip: { x: 300, y: 0, width: 840, height: 900 } });
// Tabbing between fields: does each field tear again?
await page.evaluate(() => { window.__starts = []; });
for (let i = 0; i < 4; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(80); }
R.fieldTabStarts = await page.evaluate(() => window.__starts);
// --- d. select option press
const combo = page.locator('[role=combobox]').first();
if (await combo.count()) {
  await combo.click(); await page.waitForTimeout(400);
  const opt = page.locator('[role=option]').nth(1);
  const ob = await opt.boundingBox();
  await page.mouse.move(ob.x + ob.width / 2, ob.y + ob.height / 2); await page.waitForTimeout(150);
  await page.mouse.down(); await page.waitForTimeout(40);
  R.optionPress = await page.evaluate(() => { const o = document.querySelectorAll('[role=option]')[1]; if (!o) return 'option gone'; const c = getComputedStyle(o); return { burst: o.hasAttribute('data-mosh-burst'), anims: o.getAnimations().map(a => a.animationName), filter: c.filter, translate: c.translate }; });
  await page.screenshot({ path: shots + 'mosh-option-press.png', clip: { x: Math.max(0, ob.x - 30), y: Math.max(0, ob.y - 80), width: ob.width + 60, height: 200 } });
  await page.mouse.up(); await page.waitForTimeout(400);
  R.optionChosen = await page.evaluate(() => document.querySelector('[role=combobox]').textContent.trim().slice(0, 40));
}
// --- e. submit press (pointerdown only, drag off so no click/submit)
const submit = page.locator('main button[type=submit]').first();
const sb = await submit.boundingBox();
await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2); await page.waitForTimeout(300);
await page.mouse.down(); await page.waitForTimeout(50);
R.submitPress = await page.evaluate(() => { const s = document.querySelector('main button[type=submit]'); const c = getComputedStyle(s); return { burst: s.hasAttribute('data-mosh-burst'), anims: s.getAnimations().map(a => a.animationName), filter: c.filter, translate: c.translate, transform: c.transform }; });
await page.screenshot({ path: shots + 'mosh-submit-press.png', clip: { x: sb.x - 40, y: sb.y - 30, width: sb.width + 80, height: sb.height + 60 } });
await page.mouse.move(sb.x + sb.width / 2, sb.y - 200); await page.mouse.up();
// checkboxes / radios on public pages?
R.checkboxCount = {};
// --- f. title + inline link + media + ordinal gate
for (const [path, sel, name] of [['/', '.original-artwork .artwork-caption h2 a', 'title'], ['/instagram', '.source-inline-link', 'inline'], ['/', '.media-control', 'media'], ['/ordinals', '.ordinal-gate', 'gate'], ['/mechanics', '.source-heading-link', 'headinglink']]) {
  await page.goto(base + path); await settle(page, 1500);
  const n = await page.locator(sel).count(); R.checkboxCount[path] = await page.locator('input[type=checkbox], input[type=radio]').count();
  if (!n) { R[name] = 'none found'; continue; }
  await page.locator(sel).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(900);
  await page.mouse.move(5, 5); await page.waitForTimeout(200);
  await page.locator(sel).first().hover({ force: true });
  await page.waitForTimeout(16);
  R[name] = { anims: await animsOn(sel, 0) };
  R[name].frames = await frames(sel, 0, name + '-hover', 16);
  await page.evaluate(() => document.getAnimations().forEach(a => { if (a.playState === 'paused') a.play(); }));
  await page.waitForTimeout(600);
  R[name].after = await animsOn(sel, 0);
}
R.cls = await page.evaluate(() => window.__cls);
// --- g. Keyboard through the mobile menu at 390 fine pointer: does a link re-arrive after it loses focus?
const m = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark' }); await guard(m, blocked);
const mp = await m.newPage(); watchConsole(mp, consoleLog, 'mosh-menu-kb');
await mp.goto(base + '/mechanics'); await settle(mp, 1200);
await mp.locator('header button[aria-label="Menu"]').focus(); await mp.keyboard.press('Enter'); await mp.waitForTimeout(1000);
await mp.keyboard.press('Tab'); await mp.waitForTimeout(400); // NFTs focused
await mp.keyboard.press('Tab'); // ORDINALS focused, NFTs blurred
const kbSamples = [];
for (let i = 0; i < 12; i++) { kbSamples.push(await mp.evaluate(() => { const a = document.querySelectorAll('#mobile-site-menu nav a')[0]; const c = getComputedStyle(a); return [c.opacity, c.translate, a.getAnimations().map(x => x.animationName).join(',')]; })); if (i === 3) await mp.screenshot({ path: shots + 'mosh-menu-kb-blur-replay.png' }); await mp.waitForTimeout(40); }
R.menuKeyboardBlurReplay = kbSamples;
// Enter on a menu link: does focus land on main?
await mp.keyboard.press('Tab'); await mp.keyboard.press('Tab'); await mp.keyboard.press('Tab'); await mp.keyboard.press('Tab'); await mp.keyboard.press('Tab');
R.menuKbTarget = await mp.evaluate(() => document.activeElement.textContent.trim());
await mp.keyboard.press('Enter'); await mp.waitForTimeout(1500);
R.menuKbArrival = await mp.evaluate(() => ({ url: location.pathname, focus: document.activeElement.tagName + '#' + document.activeElement.id, open: !!document.querySelector('#mobile-site-menu') }));
await m.close();
save('mosh.json', { R, consoleLog, blocked });
console.log('done');
await b.close();
