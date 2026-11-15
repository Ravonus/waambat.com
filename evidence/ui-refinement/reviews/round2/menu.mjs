// Mobile menu: hamburger hover/press, open frames, X alignment, links, close paths, focus, lock, overflow.
import { chromium, base, shots, save, guard, watchConsole, cr, hex, settle } from './lib.mjs';
const R = {}; const consoleLog = []; const blocked = [];
const b = await chromium.launch();
const ctxs = {
  p360: { viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
  p390: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
  land: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
  z200: { viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 },
  fine390: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 },
  t768: { viewport: { width: 768, height: 1024 }, hasTouch: true, deviceScaleFactor: 1 },
};
const menuState = page => page.evaluate(() => {
  const d = document.querySelector('#mobile-site-menu');
  const mb = document.querySelector('header button[aria-label="Menu"]');
  const r = e => { if (!e) return null; const x = e.getBoundingClientRect(); return [+x.x.toFixed(1), +x.y.toFixed(1), +x.width.toFixed(1), +x.height.toFixed(1)]; };
  const a = document.activeElement;
  return {
    open: !!d, phase: d?.dataset.phase ?? null, url: location.pathname, scrollY,
    expanded: mb?.getAttribute('aria-expanded'),
    focus: a ? (a.getAttribute('aria-label') || a.textContent.trim().slice(0, 30) || a.tagName) + ' <' + a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + '>' : null,
    htmlOverflow: getComputedStyle(document.documentElement).overflow, bodyOverflow: getComputedStyle(document.body).overflow,
    inert: [...document.querySelectorAll('[inert]')].map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '.' + (e.className || '').toString().slice(0, 20)),
    overlay: d ? { opacity: getComputedStyle(d).opacity, clip: getComputedStyle(d).clipPath, translate: getComputedStyle(d).translate } : null,
    menuRect: r(mb),
  };
});
const glyph = (page, sel) => page.evaluate(sel => {
  const btn = document.querySelector(sel); if (!btn) return null;
  const r = e => { const x = e.getBoundingClientRect(); return { x: +x.x.toFixed(1), y: +x.y.toFixed(1), w: +x.width.toFixed(1), h: +x.height.toFixed(1), cx: +(x.x + x.width / 2).toFixed(1), cy: +(x.y + x.height / 2).toFixed(1) }; };
  const cs = getComputedStyle(btn);
  return { button: r(btn), svg: r(btn.querySelector('svg')), paths: [...btn.querySelectorAll('path')].map(p => ({ ...r(p), transform: getComputedStyle(p).transform, opacity: getComputedStyle(p).opacity })), color: cs.color, scale: cs.transform, filter: getComputedStyle(btn.querySelector('svg')).filter, visibility: cs.visibility, burst: btn.hasAttribute('data-mosh-burst'), anim: btn.getAnimations().map(a => a.animationName) };
}, sel);
const links = page => page.evaluate(() => [...document.querySelectorAll('#mobile-site-menu nav a')].map(a => {
  const c = getComputedStyle(a), x = a.getBoundingClientRect(), i = a.querySelector('span[aria-hidden]');
  return { text: a.innerText.replace(/\s+/g, ' ').trim(), name: a.getAttribute('aria-label') || a.textContent.trim(), current: a.getAttribute('aria-current'), color: c.color, size: c.fontSize, weight: c.fontWeight, rect: [x.x, x.y, x.width, x.height].map(v => +v.toFixed(1)), clippedRight: x.right > innerWidth, opacity: c.opacity, indexColor: i ? getComputedStyle(i).color : null, indexSize: i ? getComputedStyle(i).fontSize : null, afterOpacity: getComputedStyle(a, '::after').opacity, afterShadow: getComputedStyle(a, '::after').boxShadow };
}));
async function touch(cdp, type, x, y) { await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y }] }); }
async function center(page, sel) { const bb = await page.locator(sel).first().boundingBox(); return [bb.x + bb.width / 2, bb.y + bb.height / 2]; }

for (const [name, opts] of Object.entries(ctxs)) { try {
  const ctx = await b.newContext({ ...opts, colorScheme: 'dark' }); await guard(ctx, blocked);
  const page = await ctx.newPage(); watchConsole(page, consoleLog, 'menu-' + name);
  const cdp = await ctx.newCDPSession(page);
  const touchy = !!opts.hasTouch;
  const S = R[name] = {}; globalThis.S = S;
  await page.goto(base + '/mechanics'); await settle(page, 1500);
  S.docOverflowClosed = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  const hasMenu = await page.locator('header button[aria-label="Menu"]').isVisible();
  S.hamburgerVisible = hasMenu;
  if (!hasMenu) { S.desktopNav = await page.evaluate(() => [...document.querySelectorAll('header nav a')].map(a => a.textContent.trim())); await page.screenshot({ path: shots + `menu-${name}-closed.png` }); await ctx.close(); continue; }
  S.closedGlyph = await glyph(page, 'header button[aria-label="Menu"]');
  await page.screenshot({ path: shots + `menu-${name}-closed.png` });
  const [mx, my] = await center(page, 'header button[aria-label="Menu"]');
  // Hover (only meaningful for a hover-capable pointer)
  if (!touchy) {
    await page.mouse.move(mx, my); await page.waitForTimeout(350);
    S.hoverGlyph = await glyph(page, 'header button[aria-label="Menu"]');
    await page.screenshot({ path: shots + `menu-${name}-hamburger-hover.png`, clip: { x: mx - 60, y: my - 40, width: 100, height: 80 } });
    await page.mouse.down(); await page.waitForTimeout(70);
    S.pressGlyph = await glyph(page, 'header button[aria-label="Menu"]');
    await page.screenshot({ path: shots + `menu-${name}-hamburger-press.png`, clip: { x: mx - 60, y: my - 40, width: 100, height: 80 } });
    await page.mouse.up();
  } else {
    await touch(cdp, 'touchStart', mx, my); await page.waitForTimeout(70);
    S.pressGlyph = await glyph(page, 'header button[aria-label="Menu"]');
    await page.screenshot({ path: shots + `menu-${name}-hamburger-press.png`, clip: { x: mx - 60, y: my - 40, width: 100, height: 80 } });
    // Freeze the document timeline so the opening can be captured frame by frame.
    if (name === 'p390' || name === 'p360') { await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 }); }
    await touch(cdp, 'touchEnd');
  }
  if (name === 'p390' || name === 'p360') {
    await page.waitForTimeout(150);
    const frames = [0, 40, 80, 120, 160, 200, 260, 320, 400, 500, 650];
    const names = await page.evaluate(() => document.getAnimations().map(a => a.animationName + '@' + (a.effect?.target?.className?.toString?.().slice(0, 18) || a.effect?.pseudoElement || '')));
    S.openAnimations = names;
    for (const t of frames) {
      await page.evaluate(t => { for (const a of document.getAnimations()) { if (a.timeline && a.timeline !== document.timeline) continue; a.pause(); a.currentTime = t; } }, t);
      await page.waitForTimeout(30);
      await page.screenshot({ path: shots + `menu-${name}-open-${String(t).padStart(3, '0')}.png` });
    }
    await page.evaluate(() => { for (const a of document.getAnimations()) { if (a.timeline && a.timeline !== document.timeline) continue; a.play(); } });
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 });
  } else if (!touchy) {
    // fine pointer already clicked via down/up above
  }
  await page.waitForTimeout(900);
  S.open = await menuState(page);
  S.closeGlyph = await glyph(page, 'button[aria-label="Close menu"]');
  S.menuGlyphWhileOpen = await glyph(page, 'header button[aria-label="Menu"]');
  S.links = await links(page);
  S.overlayScroll = await page.evaluate(() => { const d = document.querySelector('#mobile-site-menu'); return d && { scrollHeight: d.scrollHeight, clientHeight: d.clientHeight, scrollWidth: d.scrollWidth, clientWidth: d.clientWidth }; });
  S.logo = await page.evaluate(() => { const ls = [...document.querySelectorAll('a.site-logo, [class*=wordmark]')].filter(e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && c.visibility !== 'hidden' && c.opacity !== '0'; }); const l = document.querySelector('a.site-logo'); const r = l.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { visibleWordmarks: ls.length, rect: [r.x, r.y, r.width, r.height], hitIsLogo: l.contains(hit) || hit === l, hit: hit?.tagName + '.' + (hit?.className || '').toString().slice(0, 30), color: getComputedStyle(l).color }; });
  await page.screenshot({ path: shots + `menu-${name}-open.png` });
  // Scroll lock: try to scroll the page behind
  if (touchy) { await page.mouse.wheel(0, 600).catch(() => { }); }
  await page.evaluate(() => window.scrollBy(0, 0));
  S.scrollAfterWheel = await page.evaluate(() => scrollY);
  // overlay scroll (landscape/zoom): scroll the panel to its end and check the close control + last link
  if (S.overlayScroll && S.overlayScroll.scrollHeight > S.overlayScroll.clientHeight + 1) {
    await page.evaluate(() => { const d = document.querySelector('#mobile-site-menu'); d.scrollTop = d.scrollHeight; });
    await page.waitForTimeout(200);
    S.scrolledPanel = await page.evaluate(() => { const d = document.querySelector('#mobile-site-menu'); const as = [...d.querySelectorAll('nav a')]; const last = as.at(-1).getBoundingClientRect(); const cb = document.querySelector('button[aria-label="Close menu"]').getBoundingClientRect(); const overlaps = as.filter(a => { const r = a.getBoundingClientRect(); return r.bottom > cb.top && r.top < cb.bottom && r.right > cb.left && r.left < cb.right; }).map(a => a.textContent.trim()); const logo = document.querySelector('a.site-logo').getBoundingClientRect(); const logoOverlaps = as.filter(a => { const r = a.getBoundingClientRect(); return r.bottom > logo.top && r.top < logo.bottom && r.right > logo.left && r.left < logo.right; }).map(a => a.textContent.trim()); return { scrollTop: d.scrollTop, lastLinkBottom: last.bottom, innerHeight, closeRect: [cb.x, cb.y, cb.width, cb.height], linksUnderClose: overlaps, linksUnderLogo: logoOverlaps }; });
    await page.screenshot({ path: shots + `menu-${name}-open-scrolled.png` });
    await page.evaluate(() => { document.querySelector('#mobile-site-menu').scrollTop = 0; });
  }
  // Focus trap
  const order = [];
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); order.push(await page.evaluate(() => { const a = document.activeElement; return (a.getAttribute('aria-label') || a.textContent.trim().slice(0, 24)) + (a.closest('#mobile-site-menu') ? '' : ' [OUTSIDE]') + (a.closest('header') && !a.closest('#mobile-site-menu') ? ' [header]' : ''); })); }
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Shift+Tab'); order.push('S:' + await page.evaluate(() => { const a = document.activeElement; return (a.getAttribute('aria-label') || a.textContent.trim().slice(0, 24)) + (a.closest('#mobile-site-menu') ? '' : ' [OUTSIDE]'); })); }
  S.tabOrder = order;
  if (name === 'p390') {
    // focus ring on a link
    await page.locator('#mobile-site-menu nav a').nth(1).focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await page.waitForTimeout(350);
    S.linkFocus = await page.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return { text: a.textContent.trim(), outline: c.outline, offset: c.outlineOffset, anim: a.getAnimations().map(x => x.animationName) }; });
    await page.screenshot({ path: shots + `menu-${name}-link-focus.png` });
  }
  // Link press (touch) then cancel: does the arrival replay?
  if (touchy) {
    const [lx, ly] = await center(page, '#mobile-site-menu nav a >> nth=1');
    await touch(cdp, 'touchStart', lx, ly); await page.waitForTimeout(60);
    S.linkPress = await page.evaluate(() => { const a = document.querySelectorAll('#mobile-site-menu nav a')[1]; const c = getComputedStyle(a); return { text: a.textContent.trim(), color: c.color, burst: a.hasAttribute('data-mosh-burst'), anim: a.getAnimations().map(x => x.animationName + ':' + Math.round(x.currentTime)), textShadow: c.textShadow, translate: c.translate }; });
    await page.screenshot({ path: shots + `menu-${name}-link-press.png` });
    await touch(cdp, 'touchCancel');
    const samples = [];
    for (let i = 0; i < 14; i++) { samples.push(await page.evaluate(() => { const a = document.querySelectorAll('#mobile-site-menu nav a')[1]; const c = getComputedStyle(a); return [Math.round(performance.now()), c.opacity, c.translate, a.getAnimations().map(x => x.animationName).join(',')]; })); await page.waitForTimeout(45); }
    S.afterCancel = samples; S.urlAfterCancel = await page.evaluate(() => location.pathname);
  } else {
    // Fine pointer: hover a mobile link, then leave. Does the arrival animation replay?
    const l = page.locator('#mobile-site-menu nav a').nth(2);
    await l.hover(); await page.waitForTimeout(100);
    S.linkHover = await page.evaluate(() => { const a = document.querySelectorAll('#mobile-site-menu nav a')[2]; const c = getComputedStyle(a); return { color: c.color, anim: a.getAnimations().map(x => x.animationName), index: getComputedStyle(a.querySelector('span')).color }; });
    await page.screenshot({ path: shots + `menu-${name}-link-hover.png` });
    await page.waitForTimeout(300);
    await page.mouse.move(5, 300);
    const samples = [];
    for (let i = 0; i < 14; i++) { samples.push(await page.evaluate(() => { const a = document.querySelectorAll('#mobile-site-menu nav a')[2]; const c = getComputedStyle(a); return [Math.round(performance.now()), c.opacity, c.translate, a.getAnimations().map(x => x.animationName).join(',')]; })); if (i === 2) await page.screenshot({ path: shots + `menu-${name}-link-unhover-replay.png` }); await page.waitForTimeout(45); }
    S.afterUnhover = samples;
    // close-button hover
    const [cx, cy] = await center(page, 'button[aria-label="Close menu"]');
    await page.mouse.move(cx, cy); await page.waitForTimeout(350);
    S.closeHover = await glyph(page, 'button[aria-label="Close menu"]');
    await page.screenshot({ path: shots + `menu-${name}-close-hover.png`, clip: { x: cx - 60, y: cy - 40, width: 100, height: 80 } });
  }
  // Close by X
  const t0 = Date.now();
  if (touchy) await page.locator('button[aria-label="Close menu"]').tap(); else await page.locator('button[aria-label="Close menu"]').click();
  const closeTrace = [];
  for (let i = 0; i < 16; i++) { const s = await page.evaluate(() => { const d = document.querySelector('#mobile-site-menu'); return d ? [d.dataset.phase, getComputedStyle(d).clipPath, getComputedStyle(d).opacity] : ['gone']; }); closeTrace.push([Date.now() - t0, ...s]); if (i === 2) await page.screenshot({ path: shots + `menu-${name}-closing-x.png` }); if (s[0] === 'gone') break; await page.waitForTimeout(30); }
  S.closeX = { trace: closeTrace, after: await menuState(page), glyph: await glyph(page, 'header button[aria-label="Menu"]') };
  await page.screenshot({ path: shots + `menu-${name}-after-x.png` });
  // Escape
  if (touchy) await page.locator('header button[aria-label="Menu"]').tap(); else await page.locator('header button[aria-label="Menu"]').click();
  await page.waitForTimeout(800);
  const t1 = Date.now(); await page.keyboard.press('Escape');
  const escTrace = [];
  for (let i = 0; i < 16; i++) { const s = await page.evaluate(() => { const d = document.querySelector('#mobile-site-menu'); return d ? d.dataset.phase : 'gone'; }); escTrace.push([Date.now() - t1, s]); if (s === 'gone') break; await page.waitForTimeout(30); }
  S.escape = { trace: escTrace, after: await menuState(page) };
  // Destination tap
  if (touchy) await page.locator('header button[aria-label="Menu"]').tap(); else await page.locator('header button[aria-label="Menu"]').click();
  await page.waitForTimeout(800);
  const t2 = Date.now();
  const dest = page.locator('#mobile-site-menu nav a', { hasText: 'bio' });
  if (touchy) await dest.tap(); else await dest.click();
  const navTrace = [];
  for (let i = 0; i < 30; i++) { const s = await page.evaluate(() => { const d = document.querySelector('#mobile-site-menu'); return [location.pathname, d ? d.dataset.phase : 'gone', d ? getComputedStyle(d).clipPath : '', document.querySelector('main h1, main h2')?.textContent.trim().slice(0, 30)]; }); navTrace.push([Date.now() - t2, ...s]); if ([1, 3, 6].includes(i)) await page.screenshot({ path: shots + `menu-${name}-arrive-${i}.png` }); if (s[1] === 'gone' && s[0] !== '/mechanics' && i > 6) break; await page.waitForTimeout(30); }
  await page.waitForTimeout(700);
  S.destination = { trace: navTrace, after: await menuState(page) };
  await page.screenshot({ path: shots + `menu-${name}-arrived.png` });
  // Reopen: is bio current?
  if (touchy) await page.locator('header button[aria-label="Menu"]').tap(); else await page.locator('header button[aria-label="Menu"]').click();
  await page.waitForTimeout(900);
  S.reopenLinks = (await links(page)).map(l => [l.name, l.current, l.color]);
  S.docOverflowOpen = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  await page.keyboard.press('Escape'); await page.waitForTimeout(600);
  await ctx.close();
 } catch (e) { R[name].error = String(e).slice(0, 300); console.log(name, 'ERROR', String(e).slice(0,200)); }
}
// Contrast of the link colors on black
for (const S of Object.values(R)) if (S.links) for (const l of S.links) { l.contrast = +cr(hex(l.color), [0, 0, 0]).toFixed(2); if (l.indexColor) l.indexContrast = +cr(hex(l.indexColor), [0, 0, 0]).toFixed(2); }
save('menu.json', { R, consoleLog, blocked });
console.log(JSON.stringify(R, null, 1).slice(0, 200));
await b.close();
