// Visual critic: force every pseudo-state on every interactive element via CDP and look for legacy hues.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const base = 'http://localhost:3287';
const pages = ['/', '/ordinals', '/mechanics', '/art-by-waambat', '/instagram', '/blog-press', '/bio-waambat', '/contact-waambat', '/admin'];
const out = new URL('./', import.meta.url).pathname;
const legacy = { '148, 87, 255': '#9457ff violet', '255, 112, 112': '#ff7070 coral', '250, 117, 208': '#fa75d0 magenta', '255, 148, 178': '#ff94b2 logo', '255, 112, 186': '#ff70ba', '255, 173, 209': '#ffadd1', '198, 0, 100': '#c60064', '255, 112, 197': '#ff70c5', '255, 178, 209': '#ffb2d1', '255, 191, 216': '#ffbfd8' };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
const findings = [];
const tokens = {};
for (const path of pages) {
  const page = await ctx.newPage();
  await page.goto(base + path, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(2500);
  // scroll through to trigger lazy content
  await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } scrollTo(0, 0); });
  await page.waitForTimeout(800);
  tokens[path] = await page.evaluate(() => {
    const el = document.querySelector('.site-frame, [style*="--ui-accent"]') || document.documentElement;
    const cs = getComputedStyle(el); const r = getComputedStyle(document.documentElement);
    const names = ['--ui-accent','--ui-accent-hover','--ui-accent-nav-hover','--ui-accent-pressed','--ui-accent-focus','--ui-accent-border','--ui-accent-surface','--ui-accent-surface-strong','--ui-accent-disabled','--ui-on-accent','--ui-on-accent-hover','--ui-danger','--color-waambat-pink','--color-waambat-logo','--color-waambat-link'];
    const h = document.querySelector('main h1, main h2');
    return { scope: el.className || el.tagName, themed: Object.fromEntries(names.map(n => [n, cs.getPropertyValue(n).trim()])), root: Object.fromEntries(names.map(n => [n, r.getPropertyValue(n).trim()])), heading: h && getComputedStyle(h).color, headingText: h && h.textContent.trim().slice(0, 40), html: { colorScheme: r.colorScheme, accentColor: r.accentColor, scrollbarColor: r.scrollbarColor } };
  });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const sel = 'a, button, input, select, textarea, summary, [role=option], [role=button], [tabindex], label, .media-control, .ordinal-gate, .site-nav-link';
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: sel });
  await page.evaluate(() => { window.__probe = 0; });
  for (const nodeId of nodeIds) {
    for (const states of [[], ['hover'], ['focus', 'focus-visible'], ['active', 'hover'], ['focus-within']]) {
      try { await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: states }); } catch { continue; }
      const { object } = await cdp.send('DOM.resolveNode', { nodeId });
      const res = await cdp.send('Runtime.callFunctionOn', { objectId: object.objectId, returnByValue: true, functionDeclaration: `function(){
        const props=['color','background-color','background-image','border-top-color','border-bottom-color','outline-color','box-shadow','text-decoration-color','fill','stroke','caret-color','text-shadow','filter','accent-color'];
        const out={};
        for(const pseudo of [null,'::before','::after']){const cs=getComputedStyle(this,pseudo);if(pseudo&&cs.content==='none')continue;for(const p of props){const v=cs.getPropertyValue(p);if(p==='outline-color'&&cs.outlineStyle==='none')continue;if(p==='border-top-color'&&cs.borderTopStyle==='none')continue;if(p==='border-bottom-color'&&cs.borderBottomStyle==='none')continue;out[(pseudo||'')+p]=v;}}
        const r=this.getBoundingClientRect();
        return {tag:this.tagName.toLowerCase(),cls:String(this.className&&this.className.baseVal!==undefined?this.className.baseVal:this.className).slice(0,80),text:(this.textContent||this.getAttribute('aria-label')||'').trim().slice(0,40),visible:r.width>0&&r.height>0,out};
      }` });
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
      const v = res.result.value; if (!v || !v.visible) continue;
      for (const [prop, val] of Object.entries(v.out)) for (const [rgb, name] of Object.entries(legacy)) if (val.includes(`rgb(${rgb}`) || val.includes(`rgba(${rgb}`)) findings.push({ path, state: states.join('+') || 'rest', tag: v.tag, cls: v.cls, text: v.text, prop, value: val.slice(0, 160), legacy: name });
    }
  }
  // non-interactive elements too: everything with a legacy colour at rest
  const rest = await page.evaluate((legacy) => {
    const res = [];
    for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect(); if (!r.width) continue;
      for (const pseudo of [null, '::before', '::after']) { const cs = getComputedStyle(el, pseudo); if (pseudo && cs.content === 'none') continue;
        for (const p of ['color', 'background-color', 'background-image', 'border-top-color', 'box-shadow', 'text-shadow', 'filter', 'outline-color', 'text-decoration-color']) { const v = cs.getPropertyValue(p);
          if (p === 'border-top-color' && cs.borderTopStyle === 'none') continue; if (p === 'outline-color' && cs.outlineStyle === 'none') continue;
          for (const [rgb, name] of Object.entries(legacy)) if (v.includes(`(${rgb}`)) res.push({ tag: el.tagName.toLowerCase(), cls: String(el.className?.baseVal ?? el.className).slice(0, 60), text: (el.textContent || '').trim().slice(0, 30), pseudo, prop: p, value: v.slice(0, 120), legacy: name }); } } }
    return res; }, legacy);
  findings.push(...rest.map(r => ({ path, state: 'rest-all', ...r })));
  await page.close();
}
await browser.close();
// de-dup
const seen = new Set(); const uniq = findings.filter(f => { const k = [f.path, f.state, f.tag, f.cls, f.pseudo, f.prop, f.legacy].join('|'); if (seen.has(k)) return false; seen.add(k); return true; });
writeFileSync(out + 'probe-legacy.json', JSON.stringify({ tokens, findings: uniq }, null, 1));
console.log(JSON.stringify(tokens['/'], null, 1));
console.log(uniq.length, 'legacy hits');
const summary = {}; for (const f of uniq) { const k = `${f.legacy} | ${f.tag}.${f.cls} ${f.pseudo || ''} ${f.prop} [${f.state}]`; (summary[k] ??= new Set()).add(f.path); }
for (const [k, v] of Object.entries(summary)) console.log(k, '::', [...v].join(' '));
