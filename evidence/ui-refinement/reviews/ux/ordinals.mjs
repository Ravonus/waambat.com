import { chromium, base, shot, watchConsole, log } from './lib.mjs';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
const page = await c.newPage(); watchConsole(page, 'ordinals');
const res = {};
await page.goto(base + '/ordinals', { waitUntil: 'load' }); await page.waitForTimeout(2000);
res.buttons = await page.evaluate(() => [...document.querySelectorAll('main button')].map(b => ({ cls: b.className.slice(0, 50), text: b.textContent.trim().slice(0, 30), label: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed'), color: getComputedStyle(b).color, border: getComputedStyle(b).borderColor, bg: getComputedStyle(b).backgroundColor })));
const st = (loc) => loc.evaluate(e => { const s = getComputedStyle(e); return { text: e.textContent.trim(), pressed: e.getAttribute('aria-pressed'), color: s.color, border: s.borderColor, bg: s.backgroundColor, shadow: s.boxShadow, transform: s.transform }; });
const open = page.locator('button.ordinal-open, button[class*=action]').first();
if (await open.count()) {
  await open.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
  const bb = await open.boundingBox(); const clip = { x: bb.x - 220, y: bb.y - 60, width: bb.width + 440, height: bb.height + 120 };
  await shot(page, 'ordinal-rest', { clip });
  await open.hover(); await page.waitForTimeout(250); res.openHover = await st(open); await shot(page, 'ordinal-open-hover', { clip });
  await page.mouse.down(); await page.waitForTimeout(150); res.openPressed = await st(open); await shot(page, 'ordinal-open-pressed', { clip });
  await page.mouse.up(); await page.waitForTimeout(2500);
  res.afterOpen = await page.evaluate(() => [...document.querySelectorAll('main button')].map(b => ({ cls: b.className.slice(0, 40), text: b.textContent.trim().slice(0, 30), pressed: b.getAttribute('aria-pressed'), color: getComputedStyle(b).color, border: getComputedStyle(b).borderColor, bg: getComputedStyle(b).backgroundColor })));
  await shot(page, 'ordinal-live');
  const gate = page.locator('button.ordinal-gate');
  if (await gate.count()) {
    const gb = await gate.boundingBox(); const gclip = { x: gb.x - 220, y: gb.y - 60, width: gb.width + 440, height: gb.height + 120 };
    await gate.hover(); await page.waitForTimeout(250); res.gateHover = await st(gate); await shot(page, 'ordinal-gate-hover', { clip: gclip });
    await page.mouse.down(); await page.waitForTimeout(120); res.gatePressed = await st(gate); await shot(page, 'ordinal-gate-pressed', { clip: gclip });
    await page.mouse.up(); await page.waitForTimeout(300);
    res.gateOnHover = await st(gate);
    await page.mouse.move(10, 10); await page.waitForTimeout(300);
    res.gateOn = await st(gate); await shot(page, 'ordinal-gate-on', { clip: gclip });
    await gate.focus(); await page.keyboard.press('Space'); await page.waitForTimeout(250);
    res.gateKeyboardToggle = await st(gate);
    res.focusOutline = await gate.evaluate(e => getComputedStyle(e).outline);
    await shot(page, 'ordinal-gate-focus', { clip: gclip });
  }
}
res.log = log.filter(l => !/vimeo|403|allowfullscreen/i.test(l.text));
writeFileSync(new URL('./ordinals.json', import.meta.url), JSON.stringify(res, null, 2));
console.log(JSON.stringify(res, null, 2));
await b.close();
