// Re-check round-1 findings that are still in scope. Contact POSTs are fulfilled locally (never sent).
import { chromium, base, shots, save, settle, cr, hex } from './lib.mjs';
const b = await chromium.launch(); const R = { intercepted: [] };
async function newPage(opts = {}, status = 500) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', ...opts });
  await ctx.route('**/*', route => { const r = route.request(); if (r.method() === 'POST' && /contact/.test(r.url())) { R.intercepted.push(r.url()); return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ ok: false, error: status === 500 ? 'Your message could not be saved. Please try again.' : 'Check the highlighted fields.', fields: status === 400 ? { email: 'Enter a valid email' } : undefined }) }); } if (r.method() !== 'GET' && r.method() !== 'HEAD') return route.abort(); if (/media-originals/.test(r.url())) return route.abort(); return route.fallback(); });
  return [ctx, await ctx.newPage()];
}
// 1. Select active option (normal + forced colors) and field focus in forced colors
for (const fc of ['none', 'active']) {
  const [ctx, p] = await newPage({ forcedColors: fc });
  await p.goto(base + '/contact-waambat'); await settle(p, 1500);
  const combo = p.locator('[role=combobox]').first(); await combo.scrollIntoViewIfNeeded(); await combo.focus(); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(300); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(200);
  R['select-' + fc] = await p.evaluate(() => { const act = document.querySelector('[role=option][data-active]'); const other = [...document.querySelectorAll('[role=option]')].find(o => !o.hasAttribute('data-active') && o.getAttribute('aria-selected') !== 'true'); const list = act.parentElement; const s = e => { const c = getComputedStyle(e); return { color: c.color, bg: c.backgroundColor, shadow: c.boxShadow, outline: c.outline }; }; return { active: s(act), other: s(other), listBg: getComputedStyle(list).backgroundColor, text: act.textContent.trim() }; });
  const lb = await p.locator('[role=listbox]').boundingBox();
  await p.screenshot({ path: shots + `r1-select-active-forced-${fc}.png`, clip: { x: lb.x - 10, y: lb.y - 10, width: lb.width + 20, height: lb.height + 20 } });
  await p.keyboard.press('Escape');
  const inp = p.locator('main input:not([type=hidden])').first(); await inp.focus(); await p.waitForTimeout(400);
  R['fieldFocus-' + fc] = await p.evaluate(() => { const f = document.activeElement.closest('[data-mosh-field]'); const c = getComputedStyle(f); return { outline: c.outline, shadow: c.boxShadow.slice(0, 80) }; });
  const fb = await inp.boundingBox(); await p.screenshot({ path: shots + `r1-field-focus-forced-${fc}.png`, clip: { x: fb.x - 30, y: fb.y - 30, width: fb.width + 60, height: fb.height + 60 } });
  await ctx.close();
}
// 2. Server error colour vs success; client validation aria-invalid
{
  const [ctx, p] = await newPage({}, 500);
  await p.goto(base + '/contact-waambat'); await settle(p, 1500);
  await p.locator('main button[type=submit]').click(); await p.waitForTimeout(300);
  R.clientValidation = await p.evaluate(() => [...document.querySelectorAll('main [required]')].map(e => ({ name: e.name || e.id, ariaInvalid: e.getAttribute('aria-invalid'), userInvalid: e.matches(':user-invalid') })));
  const inputs = p.locator('main input:not([type=hidden]), main textarea'); const n = await inputs.count();
  for (let i = 0; i < n; i++) { const t = await inputs.nth(i).getAttribute('type'); await inputs.nth(i).fill(t === 'email' ? 'critic@example.test' : 'Critic test - intercepted, not sent'); }
  await p.locator('main button[type=submit]').click(); await p.waitForTimeout(800);
  R.serverError = await p.evaluate(() => { const s = document.querySelector('main [role=status]'); return { text: s.textContent.trim(), color: getComputedStyle(s).color, tone: s.dataset.tone, focused: document.activeElement === s }; });
  await p.screenshot({ path: shots + 'r1-server-error.png', clip: { x: 300, y: 0, width: 840, height: 900 } });
  await ctx.close();
}
// 3. Save dialog error -> "Try again" styling (HEAD and GET of originals aborted)
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/*', route => { const r = route.request(); if (r.method() !== 'GET' && r.method() !== 'HEAD') return route.abort(); if (/media-originals/.test(r.url())) return route.abort(); return route.fallback(); });
  const p = await ctx.newPage(); await p.goto(base + '/art-by-waambat'); await settle(p, 2500);
  const img = p.locator('main img').first(); await img.scrollIntoViewIfNeeded(); await p.waitForTimeout(600); const ib = await img.boundingBox();
  await p.mouse.click(ib.x + ib.width / 2, ib.y + ib.height / 2, { button: 'right' }); await p.waitForTimeout(2500);
  const retry = p.locator('dialog.waambat-download button', { hasText: /try again/i });
  if (await retry.count()) {
    R.retryRest = await retry.evaluate(e => { const c = getComputedStyle(e); return { color: c.color, border: c.border, padding: c.padding, decoration: c.textDecorationLine, bg: c.backgroundColor }; });
    await retry.hover(); await p.waitForTimeout(300);
    R.retryHover = await retry.evaluate(e => { const c = getComputedStyle(e); return { color: c.color, border: c.borderColor, decoration: c.textDecorationLine }; });
    await p.screenshot({ path: shots + 'r1-save-retry.png', clip: { x: 420, y: 150, width: 600, height: 600 } });
  } else R.retry = await p.evaluate(() => document.querySelector('dialog.waambat-download')?.innerText.slice(0, 200) ?? 'no dialog');
  await ctx.close();
}
// 4. Desktop nav pressed colour; archive viewer hover; admin link hover
{
  const [ctx, p] = await newPage();
  await p.goto(base + '/contact-waambat'); await settle(p, 1500);
  const l = p.locator('header nav a').nth(2); const bb = await l.boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height * 0.75); await p.waitForTimeout(400); await p.mouse.down(); await p.waitForTimeout(200);
  R.navPressed = await l.evaluate(e => getComputedStyle(e).color);
  await p.mouse.move(bb.x + bb.width / 2, bb.y + 300); await p.mouse.up();
  await p.goto(base + '/art-by-waambat'); await settle(p, 2500);
  const exp = p.locator('.archive-expand').first();
  if (await exp.count()) { await exp.scrollIntoViewIfNeeded(); await exp.hover(); await p.waitForTimeout(200); await exp.click(); await p.waitForTimeout(800); const c = p.locator('.archive-close'); const cb = await c.boundingBox(); await p.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2); await p.waitForTimeout(300); R.archiveCloseHover = await c.evaluate(e => getComputedStyle(e).color); await p.keyboard.press('Escape'); }
  await p.goto(base + '/admin'); await settle(p, 1200);
  const a = p.locator('a.text-waambat-logo').first(); if (await a.count()) { await a.hover(); await p.waitForTimeout(300); R.adminWordmarkHover = await a.evaluate(e => getComputedStyle(e).color); }
  R.adminButtons = await p.evaluate(() => [...document.querySelectorAll('main button')].map(b => ({ text: b.textContent.trim(), border: getComputedStyle(b).borderTopColor })));
  await ctx.close();
}
save('r1check.json', R); console.log(JSON.stringify(R, null, 1)); await b.close();
