// Visual critic: exercise interactive states on the live preview and record computed colours + screenshots.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const base = 'http://localhost:3287';
const dir = new URL('./', import.meta.url).pathname;
const R = {};
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', serviceWorkers: 'block' });
// Safety: no non-GET request ever leaves the browser (no contact message, no admin change).
const held = [];
await ctx.route('**/*', (route) => { const m = route.request().method(); if (m === 'GET' || m === 'HEAD') return route.continue(); held.push(route); });
const cs = (page, sel, props, pseudo = null) => page.evaluate(([sel, props, pseudo]) => { const el = typeof sel === 'string' ? document.querySelector(sel) : null; if (!el) return null; const c = getComputedStyle(el, pseudo); return Object.fromEntries(props.map(p => [p, c.getPropertyValue(p)])); }, [sel, props, pseudo]);
const P = ['color', 'background-color', 'background-image', 'border-top-color', 'box-shadow', 'outline', 'opacity', 'text-decoration-line', 'text-decoration-color'];
const shot = (page, name, clip) => page.screenshot({ path: dir + name + '.png', ...(clip ? { clip } : {}) });

// ---- Contact form ----
{
  const page = await ctx.newPage();
  await page.goto(base + '/contact-waambat', { waitUntil: 'load' }); await page.waitForTimeout(2000);
  R.contactInputs = await page.evaluate(() => [...document.querySelectorAll('form input, form textarea, form select, form button')].map(e => `${e.tagName.toLowerCase()}[type=${e.type}] ${e.name || ''} ${e.getAttribute('aria-haspopup') || ''}`));
  const form = page.locator('form').first(); await form.scrollIntoViewIfNeeded();
  const fb = await form.boundingBox();
  const clip = { x: Math.max(0, fb.x - 20), y: Math.max(0, fb.y - 20), width: Math.min(1440 - fb.x + 20, fb.width + 40), height: Math.min(900, fb.height + 60) };
  R.label = await cs(page, 'form label, form [class*=floatingLabel]', P);
  R.required = await cs(page, 'form [class*=required]', ['color']);
  R.frameRest = await cs(page, 'form [class*=frame]', ['box-shadow', 'background-color']);
  await page.locator('form [class*=frame]').first().hover(); await page.waitForTimeout(300);
  R.frameHover = await cs(page, 'form [class*=frame]', ['box-shadow', 'background-color']);
  const submit = form.locator('button[type=submit]');
  R.submitRest = await cs(page, 'form button[type=submit]', P);
  await submit.hover(); await page.waitForTimeout(500);
  R.submitHover = await cs(page, 'form button[type=submit]', P);
  R.submitHoverBefore = await cs(page, 'form button[type=submit]', ['background-color', 'transform'], '::before');
  await page.mouse.down(); await page.waitForTimeout(150);
  R.submitActive = await cs(page, 'form button[type=submit]', P);
  await shot(page, 'v-submit-pressed', clip);
  await page.mouse.up(); await page.mouse.move(5, 5); await page.waitForTimeout(300);
  // cursor over the filled pastel submit button (pastel on pastel)
  const sb = await submit.boundingBox();
  await page.mouse.move(5, 5); await page.waitForTimeout(200);
  // keyboard focus on submit
  await submit.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await page.waitForTimeout(400);
  R.submitFocus = await cs(page, 'form button[type=submit]', P);
  await shot(page, 'v-submit-focus-visible', clip);
  // custom select
  const sel = form.locator('button[aria-haspopup]').first();
  await sel.click(); await page.waitForTimeout(400);
  const opts = page.locator('[role=option]');
  await opts.nth(2).hover(); await page.waitForTimeout(200);
  R.optionActive = await page.evaluate(() => { const all=[...document.querySelectorAll('[role=option]')]; const o = all.find(e=>e.hasAttribute('data-active')&&e.getAttribute('data-active')!=='false') ; if(!o) return {attrs: all.map(e=>e.outerHTML.slice(0,160))}; const c = getComputedStyle(o); const l = getComputedStyle(o.parentElement); const r = getComputedStyle(all.find(e=>e!==o)); return { active: { color: c.color, bg: c.backgroundColor }, rest: { color: r.color, bg: r.backgroundColor }, list: { bg: l.backgroundColor, border: l.borderTopColor } }; });
  await shot(page, 'v-select-hover', clip);
  await opts.nth(2).click(); await page.waitForTimeout(300);
  await sel.click(); await page.waitForTimeout(300);
  await opts.nth(0).hover(); await page.waitForTimeout(200);
  R.optionSelected = await page.evaluate(() => { const o = document.querySelector('[role=option][aria-selected="true"]'); if(!o) return null; const c = getComputedStyle(o); return { color: c.color, bg: c.backgroundColor, svg: o.querySelector('svg') && getComputedStyle(o.querySelector('svg')).color }; });
  await shot(page, 'v-select-selected', clip);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  R.selectChosen = await cs(page, 'form button[aria-haspopup]', ['color']);
  // fill fields with obvious dummy data (requests are held; nothing is sent)
  const inputs = form.locator('input:not([type=hidden]):not([tabindex="-1"]):not([type=checkbox]):not([type=radio]), textarea');
  const n = await inputs.count();
  for (let i = 0; i < n; i++) { const el = inputs.nth(i); if (!(await el.isVisible())) continue; const t = await el.getAttribute('type'); await el.fill(t === 'email' ? 'visual-critic@example.test' : 'Visual critic test (not sent)'); }
  R.checks = await page.evaluate(() => [...document.querySelectorAll('form input[type=checkbox], form input[type=radio]')].map(c => ({ type: c.type, visible: c.getBoundingClientRect().width > 0, ...Object.fromEntries(['border-top-color', 'background-color', 'accent-color'].map(p => [p, getComputedStyle(c).getPropertyValue(p)])) })));
  await page.mouse.move(5, 5);
  await shot(page, 'v-form-filled', clip);
  await submit.click(); await page.waitForTimeout(600);
  R.heldRequests = held.map(r => `${r.request().method()} ${r.request().url()}`);
  R.submitPending = await cs(page, 'form button[type=submit]', P);
  R.pendingFieldset = await page.evaluate(() => { const f = document.querySelector('form fieldset'); return f && { disabled: f.disabled, input: getComputedStyle(f.querySelector('input,textarea')).color, frame: getComputedStyle(f.querySelector('[class*=frame]')).boxShadow }; });
  await shot(page, 'v-form-pending', clip);
  for (const r of held.splice(0)) await r.abort('failed');
  await page.waitForTimeout(1200);
  R.afterAbortStatus = await page.evaluate(() => { const s = document.querySelector('form [role=status], [role=status][aria-live]'); const a = document.querySelector('form [role=alert]'); return { status: s && { text: s.textContent.trim().slice(0, 160), color: getComputedStyle(s).color }, alert: a && { text: a.textContent.trim().slice(0, 160), color: getComputedStyle(a).color }, invalid: [...document.querySelectorAll('[aria-invalid="true"]')].length }; });
  await shot(page, 'v-form-error', clip);
  // custom invalid state: clear the email and blur to trigger aria-invalid if supported
  const email = form.locator('input[type=email]').first();
  if (await email.count()) { await email.fill('not-an-email'); await page.locator('form textarea').first().focus(); await submit.click(); await page.waitForTimeout(500);
    R.invalid = await page.evaluate(() => { const i = document.querySelector('[aria-invalid="true"]'); const e = document.querySelector('form [class*=error]'); return { count: document.querySelectorAll('[aria-invalid="true"]').length, frame: i && getComputedStyle(i.closest('[class*=frame]')).boxShadow, error: e && { text: e.textContent, color: getComputedStyle(e).color } }; });
    for (const r of held.splice(0)) await r.abort('failed');
    await page.waitForTimeout(500); await shot(page, 'v-form-invalid', clip); }
  // selection highlight
  await page.evaluate(() => { const h = document.querySelector('main p'); const r = document.createRange(); r.selectNodeContents(h); getSelection().removeAllRanges(); getSelection().addRange(r); h.scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(200);
  R.selection = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('main p'), '::selection'); return { bg: c.backgroundColor, color: c.color }; });
  const pb = await page.evaluate(() => { const r = document.querySelector('main p').getBoundingClientRect(); return { x: Math.max(0, r.x - 10), y: Math.max(0, r.y - 10), width: Math.min(900, r.width + 20), height: Math.min(300, r.height + 20) }; });
  await shot(page, 'v-selection', pb);
  await page.close();
}
// ---- Cursor over the pastel button and over light artwork ----
{
  const page = await ctx.newPage();
  await page.goto(base + '/contact-waambat', { waitUntil: 'load' }); await page.waitForTimeout(2000);
  const submit = page.locator('form button[type=submit]'); await submit.scrollIntoViewIfNeeded();
  const b = await submit.boundingBox();
  await page.mouse.move(b.x + 40, b.y + b.height / 2 - 4); await page.waitForTimeout(150); // over the filled button, avoid hover inversion? hover will invert
  await page.waitForTimeout(400);
  await shot(page, 'v-cursor-over-submit', { x: b.x - 20, y: b.y - 20, width: b.width + 40, height: b.height + 40 });
  R.cursor = await page.evaluate(() => { const s = document.querySelector('.waambat-cursor span'); const c = s && getComputedStyle(s); return s && { bg: c.backgroundImage, filter: c.filter, open: document.querySelector('.waambat-cursor').matches(':popover-open'), state: document.documentElement.dataset.waambatCursor, cursorAttr: document.querySelector('.waambat-cursor').dataset }; });
  // cursor over the filled textarea text cursor state
  const ta = page.locator('form textarea').first(); const tb = await ta.boundingBox();
  await page.mouse.move(tb.x + 60, tb.y + 40); await page.waitForTimeout(400);
  await shot(page, 'v-cursor-text', { x: tb.x, y: tb.y, width: 200, height: 100 });
  await page.close();
  const p2 = await ctx.newPage();
  await p2.goto(base + '/bio-waambat', { waitUntil: 'load' }); await p2.waitForTimeout(2500);
  // find the brightest pixel region among visible images
  const buf = await p2.screenshot();
  const imgs = await p2.evaluate(() => [...document.querySelectorAll('main img')].map(i => { const r = i.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }).filter(r => r[2] > 50 && r[1] > 0 && r[1] + r[3] < innerHeight));
  R.bioImgs = imgs.length;
  if (imgs[0]) { const [x, y, w, h] = imgs[0]; await p2.mouse.move(x + w / 2, y + h / 2); await p2.waitForTimeout(400); await shot(p2, 'v-cursor-over-art', { x: x + w / 2 - 60, y: y + h / 2 - 50, width: 140, height: 120 }); }
  await p2.close();
}
// ---- Canvas scrollbar colours (rest / hover / drag) ----
{
  const page = await ctx.newPage();
  await page.goto(base + '/mechanics', { waitUntil: 'load' }); await page.waitForTimeout(2000);
  const px = async () => page.evaluate(() => { const c = document.querySelector('.waambat-scroll-rail canvas'); if (!c) return null; const g = c.getContext('2d'); const out = {}; const d = g.getImageData(0, 0, c.width, c.height).data; const seen = {}; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { const k = '#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join(''); seen[k] = (seen[k] || 0) + 1; } return Object.entries(seen).sort((a, b) => b[1] - a[1]).slice(0, 3); });
  R.railRest = await px();
  const rail = await page.locator('.waambat-scroll-rail').boundingBox();
  R.railBox = rail;
  if (rail) {
    await page.mouse.move(rail.x + rail.width / 2, rail.y + 40); await page.waitForTimeout(300);
    R.railHover = await px();
    await shot(page, 'v-rail-hover', { x: 1380, y: 0, width: 60, height: 260 });
    await page.mouse.down(); await page.waitForTimeout(200); R.railActive = await px(); await page.mouse.up();
    await page.keyboard.press('Tab');
    await page.locator('.waambat-scroll-rail').focus(); await page.waitForTimeout(200);
    R.railFocus = await cs(page, '.waambat-scroll-rail', ['outline', 'background-color']);
  }
  await page.close();
}
// ---- Progress bar + skeleton during a slow client navigation ----
{
  const page = await ctx.newPage();
  await page.goto(base + '/bio-waambat', { waitUntil: 'load' }); await page.waitForTimeout(2000);
  let slow = true;
  await page.route('**/*', async (route) => { const t = route.request().resourceType(); if (slow && (t === 'fetch' || t === 'xhr' || t === 'script' || t === 'document')) { await new Promise(r => setTimeout(r, 4000)); } return route.fallback(); });
  await page.locator('header nav a[href="/mechanics"]').first().click();
  await page.waitForTimeout(700);
  R.progress = await page.evaluate(() => { const out = []; for (const el of document.querySelectorAll('[class*=progress], [class*=bone], .waambat-skeleton, .waambat-skeleton-art, .waambat-skeleton-line, [data-pending]')) { const c = getComputedStyle(el), a = getComputedStyle(el, '::after'), b = getComputedStyle(el, '::before'); out.push({ cls: String(el.className).slice(0, 60), pending: el.hasAttribute('data-pending'), color: c.color, bg: c.backgroundColor, img: c.backgroundImage.slice(0, 200), after: a.content !== 'none' ? a.backgroundImage.slice(0, 200) + ' ' + a.backgroundColor : null, before: b.content !== 'none' ? b.backgroundImage.slice(0, 200) + ' ' + b.backgroundColor : null }); } return out; });
  await shot(page, 'v-nav-pending');
  slow = false;
  await page.waitForTimeout(5000);
  await page.close();
}
// ---- Ordinals controls ----
{
  const page = await ctx.newPage();
  await page.goto(base + '/ordinals', { waitUntil: 'load' }); await page.waitForTimeout(2500);
  const gate = page.locator('.ordinal-gate').first();
  if (await gate.count()) { await gate.scrollIntoViewIfNeeded(); await gate.hover(); await page.waitForTimeout(300);
    R.gateHover = await cs(page, '.ordinal-gate', P);
    const g = await gate.boundingBox(); await shot(page, 'v-ordinal-gate-hover', { x: g.x - 120, y: g.y - 30, width: g.width + 240, height: g.height + 60 }); }
  const action = page.locator('[class*=_action_]').first();
  if (await action.count()) { await action.hover(); await page.waitForTimeout(300); R.ordinalActionHover = await page.evaluate(() => { const e = document.querySelector('[class*=_action_]'); const c = getComputedStyle(e); return { color: c.color, border: c.borderTopColor, bg: c.backgroundColor }; }); }
  R.ordinalLinks = await page.evaluate(() => [...document.querySelectorAll('main a')].slice(0, 4).map(a => ({ t: a.textContent.trim().slice(0, 25), color: getComputedStyle(a).color, deco: getComputedStyle(a).textDecorationLine })));
  await page.close();
}
// ---- Save dialog on a tiny image ----
{
  const page = await ctx.newPage();
  let target = null, path = null;
  for (const p of ['/blog-press', '/bio-waambat', '/art-by-waambat', '/instagram', '/']) {
    await page.goto(base + p, { waitUntil: 'load' }); await page.waitForTimeout(1500);
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 800) { scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); } });
    const found = await page.evaluate(() => { const i = [...document.querySelectorAll('img')].find(i => /1e9746460|09eb603d/.test(i.currentSrc || i.src)); if (!i) return null; i.scrollIntoView({ block: 'center' }); return true; });
    if (found) { target = page.locator('img').filter({ has: page.locator('xpath=self::img') }); path = p; break; }
  }
  R.saveFrom = path;
  if (path) {
    await page.waitForTimeout(500);
    const box = await page.evaluate(() => { const i = [...document.querySelectorAll('img')].find(i => /1e9746460|09eb603d/.test(i.currentSrc || i.src)); const r = i.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await page.mouse.click(box[0], box[1], { button: 'right' });
    await page.waitForTimeout(150);
    await shot(page, 'v-save-checking');
    await page.waitForTimeout(2500);
    R.saveDialog = await page.evaluate(() => { const d = document.querySelector('dialog.waambat-download'); if (!d) return null; const g = (s, p = null) => { const e = d.querySelector(s); if (!e) return null; const c = getComputedStyle(e, p); return { color: c.color, bg: c.backgroundColor, border: c.borderTopColor, shadow: c.boxShadow }; }; return { open: d.open, dialog: { bg: getComputedStyle(d).backgroundColor, border: getComputedStyle(d).borderTopColor }, kicker: g('.waambat-download-kicker'), h2: g('h2'), close: g('.waambat-download-close'), save: g('.waambat-download-save'), cancel: g('.waambat-download-cancel'), alert: g('[role=alert]'), alertBtn: g('[role=alert] button'), progress: g('.waambat-download-progress'), text: d.innerText.slice(0, 300) }; });
    await shot(page, 'v-save-dialog');
    if (await page.locator('.waambat-download-save').count()) { await page.locator('.waambat-download-save').hover(); await page.waitForTimeout(300); R.saveHover = await cs(page, '.waambat-download-save', ['color', 'background-color', 'box-shadow']); await shot(page, 'v-save-hover'); }
    await page.locator('.waambat-download-cancel').hover(); await page.waitForTimeout(250); R.cancelHover = await cs(page, '.waambat-download-cancel', ['color']);
    await page.locator('.waambat-download-close').hover(); await page.waitForTimeout(250); R.closeHover = await cs(page, '.waambat-download-close', ['color']);
    await page.keyboard.press('Tab'); await page.waitForTimeout(150);
    R.dialogFocus = await page.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return { el: a.className || a.tagName, outline: c.outline }; });
    await shot(page, 'v-save-focus');
    await page.locator('.waambat-download-cancel').click(); await page.waitForTimeout(400);
    R.dialogClosed = await page.evaluate(() => !document.querySelector('dialog.waambat-download').open);
  }
  await page.close();
}
// ---- Mobile menu ----
{
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', isMobile: true, hasTouch: true });
  const page = await m.newPage();
  await page.goto(base + '/mechanics', { waitUntil: 'load' }); await page.waitForTimeout(1500);
  R.menuButton = await cs(page, 'header button', ['color']);
  await page.locator('header button').first().click(); await page.waitForTimeout(800);
  R.mobileMenu = await page.evaluate(() => [...document.querySelectorAll('header a, header button')].filter(e => e.getBoundingClientRect().width).map(e => ({ t: (e.textContent || e.getAttribute('aria-label')).trim().slice(0, 20), color: getComputedStyle(e).color })));
  await shot(page, 'v-mobile-menu');
  await m.close();
}
// ---- Admin login (light + dark OS) ----
for (const scheme of ['light', 'dark']) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
  const page = await c.newPage();
  await page.goto(base + '/admin', { waitUntil: 'load' }); await page.waitForTimeout(1500);
  const inp = page.locator('input').first();
  if (await inp.count()) { await inp.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await page.waitForTimeout(200); }
  R['admin_' + scheme] = await page.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); const btn = document.querySelector('main button'); return { focused: a.tagName + '.' + a.className, outline: c.outline, border: c.borderTopColor, bg: c.backgroundColor, scheme: c.colorScheme, button: btn && { color: getComputedStyle(btn).color, bg: getComputedStyle(btn).backgroundColor } }; });
  await shot(page, 'v-admin-' + scheme);
  await c.close();
}
await browser.close();
writeFileSync(dir + 'states.json', JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
