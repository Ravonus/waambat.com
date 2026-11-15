// Palette audit: default/hover/focus colours of interactive elements, contact form states, rail.
import { chromium, guard, go, save, shots, pages, pname, rgb, hue, toHex } from './lib.mjs';
const b = await chromium.launch(); const R = { tab: {}, hover: {}, form: {}, colors: {} };
const tally = (k, c, where) => { if (!c || /rgba\(0, 0, 0, 0\)|transparent/.test(c)) return; const v = rgb(c); if (!v) return; const key = toHex(v); (R.colors[key] ??= { n: 0, ...hue(v), where: new Set() }).n++; R.colors[key].where.add(k + '@' + where); };
const desk = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' }); await guard(desk);
for (const p of pages) {
  const page = await desk.newPage(); await go(page, p, 2000);
  const seen = [];
  for (let i = 0; i < 45; i++) {
    await page.keyboard.press('Tab'); await page.waitForTimeout(60);
    const f = await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return { tag: e.tagName, label: (e.getAttribute('aria-label') || e.textContent || e.name || '').trim().slice(0, 30), outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`, offset: s.outlineOffset, shadow: s.boxShadow.slice(0, 80), color: s.color, fv: e.matches(':focus-visible'), visible: r.width > 0 && r.height > 0 }; });
    if (!f) continue; seen.push(f);
    if (f.outline.startsWith('none') && f.shadow === 'none') f.NO_RING = true; else tally('focus', f.outline.split(' ').slice(2).join(' '), pname(p));
  }
  R.tab[pname(p)] = seen;
  const handles = await page.$$('a[href]:visible, button:visible');
  const hv = [];
  for (const h of handles.slice(0, 40)) {
    const bb = await h.boundingBox(); if (!bb || bb.y < 0 || bb.y + bb.height > 900 || bb.width < 4) continue;
    const before = await h.evaluate(e => ({ c: getComputedStyle(e).color, bg: getComputedStyle(e).backgroundColor, t: (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 24), cls: String(e.className).slice(0, 40) }));
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.waitForTimeout(260);
    const after = await h.evaluate(e => ({ c: getComputedStyle(e).color, bg: getComputedStyle(e).backgroundColor }));
    hv.push({ ...before, hc: after.c, hbg: after.bg });
    tally('link', before.c, pname(p)); tally('hover', after.c, pname(p)); if (after.bg !== before.bg) tally('hoverbg', after.bg, pname(p));
    await page.mouse.move(1, 450); await page.waitForTimeout(80);
  }
  R.hover[pname(p)] = hv;
  await page.close();
}
{
  const page = await desk.newPage(); await go(page, '/contact-waambat', 2000);
  R.form.controls = await page.evaluate(() => [...document.querySelectorAll('main input, main textarea, main select, main button, main [role=combobox]')].map(e => { const s = getComputedStyle(e); return { tag: e.tagName, type: e.type, name: e.name || e.getAttribute('aria-label') || e.textContent.trim().slice(0, 20), color: s.color, bg: s.backgroundColor, border: s.borderColor, accent: s.accentColor, scheme: s.colorScheme, disabled: e.disabled }; }));
  const field = page.locator('main input:not([type=hidden]):not([type=checkbox]):not([type=radio])').first();
  await field.scrollIntoViewIfNeeded(); await field.click(); await page.waitForTimeout(450);
  R.form.focusedField = await field.evaluate(e => { const w = e.closest('[data-mosh-field]') || e; const s = getComputedStyle(e), ws = getComputedStyle(w); return { border: s.borderColor, outline: s.outlineColor + ' ' + s.outlineStyle, shadow: s.boxShadow, wshadow: ws.boxShadow, wborder: ws.borderColor, caret: s.caretColor }; });
  const bb = await field.boundingBox();
  await page.screenshot({ path: shots + 'form-field-focus.png', clip: { x: Math.max(0, bb.x - 30), y: bb.y - 40, width: bb.width + 60, height: bb.height + 80 } });
  const submit = page.locator('main button[type=submit]');
  if (await submit.count()) {
    R.form.submitDefault = await submit.evaluate(e => { const s = getComputedStyle(e); return { c: s.color, bg: s.backgroundColor, border: s.borderColor }; });
    const sb = await submit.boundingBox(); await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2); await page.waitForTimeout(300);
    R.form.submitHover = await submit.evaluate(e => { const s = getComputedStyle(e); return { c: s.color, bg: s.backgroundColor, border: s.borderColor }; });
    await page.screenshot({ path: shots + 'form-submit-hover.png', clip: { x: Math.max(0, sb.x - 40), y: sb.y - 30, width: sb.width + 80, height: sb.height + 60 } });
  }
  const combo = page.locator('main [role=combobox], main button[aria-haspopup=listbox]').first();
  if (await combo.count()) {
    await combo.scrollIntoViewIfNeeded(); await combo.click(); await page.waitForTimeout(400);
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(200);
    R.form.options = await page.evaluate(() => [...document.querySelectorAll('[role=option]')].slice(0, 6).map(o => { const s = getComputedStyle(o); return { t: o.textContent.trim().slice(0, 20), sel: o.getAttribute('aria-selected'), c: s.color, bg: s.backgroundColor, shadow: s.boxShadow.slice(0, 60) }; }));
    const lb = await page.locator('[role=listbox]').first().boundingBox();
    if (lb) await page.screenshot({ path: shots + 'form-select-open.png', clip: { x: Math.max(0, lb.x - 20), y: Math.max(0, lb.y - 70), width: lb.width + 40, height: Math.min(lb.height + 90, 800) } });
    await page.keyboard.press('Escape');
  }
  await page.close();
}
for (const k of Object.keys(R.colors)) R.colors[k].where = [...R.colors[k].where].slice(0, 8);
save('palette.json', R);
const rows = Object.entries(R.colors).sort((a, b) => b[1].n - a[1].n);
for (const [k, v] of rows) console.log(k, v.n, 'h', v.h, 's', v.s, 'l', v.l, v.where.slice(0, 4).join(' '));
console.log('NO_RING:', JSON.stringify(Object.fromEntries(Object.entries(R.tab).map(([k, v]) => [k, v.filter(x => x.NO_RING).map(x => x.tag + ':' + x.label)]))));
console.log('form', JSON.stringify(R.form, null, 0));
await b.close();
