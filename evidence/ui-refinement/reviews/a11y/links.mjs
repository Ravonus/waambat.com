import { chromium, BASE, PAGES, OUT, cr, rgbToHex } from './common.mjs';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch();
const c = await browser.newContext({ viewport:{width:1440,height:900}, colorScheme:'dark', reducedMotion:'reduce' });
const out = {};
for (const p of PAGES) {
  const page = await c.newPage();
  await page.goto(BASE+p, { waitUntil:'load' }); await page.waitForTimeout(2000);
  const data = await page.evaluate(() => {
    const bgOf = (el) => { while (el) { const b = getComputedStyle(el).backgroundColor; if (b && b !== 'rgba(0, 0, 0, 0)' && b !== 'transparent') return b; el = el.parentElement; } return 'rgb(0, 0, 0)'; };
    const html = getComputedStyle(document.documentElement);
    const links = [...document.querySelectorAll('main a, .site-main a, footer a')].filter(a => a.textContent.trim() && a.getClientRects().length);
    const res = links.map(a => {
      const s = getComputedStyle(a), parent = a.parentElement, ps = getComputedStyle(parent);
      // inline in text? parent contains non-whitespace text outside this link
      const otherText = [...parent.childNodes].some(n => n !== a && (n.nodeType === 3 ? n.textContent.trim().length > 1 : (n.nodeType===1 && !n.contains(a) && n.tagName!=='BR' && n.textContent.trim().length>1 && getComputedStyle(n).display.startsWith('inline'))));
      return { text: a.textContent.trim().slice(0,40), cls: a.className.slice(0,60), color: s.color, parentColor: ps.color, deco: s.textDecorationLine, decoColor: s.textDecorationColor, thick: s.textDecorationThickness, bg: bgOf(a), inline: otherText, parentTag: parent.tagName };
    });
    const sel = getComputedStyle(document.querySelector('p') || document.body, '::selection');
    return { colorScheme: html.colorScheme, accentColor: html.accentColor, scrollbarColor: html.scrollbarColor, selection: { bg: sel.backgroundColor, color: sel.color }, links: res };
  });
  out[p] = data;
  await page.close();
}
await browser.close();
writeFileSync(OUT+'links.json', JSON.stringify(out,null,1));
for (const [p,d] of Object.entries(out)) {
  console.log(`\n== ${p}  color-scheme=${d.colorScheme} accent-color=${d.accentColor} scrollbar=${d.scrollbarColor} selection=${rgbToHex(d.selection.bg)}/${rgbToHex(d.selection.color)}`);
  const seen = new Set();
  for (const l of d.links) {
    const key = [l.cls,l.color,l.deco,l.inline].join('|'); if (seen.has(key)) continue; seen.add(key);
    const c1 = rgbToHex(l.color), c2 = rgbToHex(l.parentColor), bg = rgbToHex(l.bg);
    console.log(`${l.inline?'INLINE':'block '} "${l.text}" .${l.cls.split(' ')[0]} color=${c1} vsBg=${cr(c1.slice(0,7),bg.slice(0,7))} parent=${c2} vsText=${cr(c1.slice(0,7),c2.slice(0,7))} deco=${l.deco} ${rgbToHex(l.decoColor)} bg=${bg}`);
  }
}
