import { chromium, base } from './lib.mjs';
const b = await chromium.launch();
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(base + '/contact-waambat', { waitUntil: 'load' }); await page.waitForTimeout(1200);
console.log(await page.evaluate(() => { const out = []; for (const s of document.styleSheets) { let rules; try { rules = s.cssRules; } catch { continue; } const walk = (rs) => { for (const r of rs) { if (r.cssRules) walk(r.cssRules); if (r.selectorText && /option|required|submit:active|\.link:active|site-nav-link:hover|link\[data-pending/.test(r.selectorText)) out.push((s.href||'inline').split('/').pop() + ' :: ' + r.cssText.slice(0, 200)); } }; walk(rules); } return out.join('\n'); }));
await b.close();
