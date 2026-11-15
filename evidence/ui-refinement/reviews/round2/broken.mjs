import { chromium, base, save, settle } from './lib.mjs';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const fails = []; p.on('response', r => { if (r.status() >= 400 && /localhost/.test(r.url())) fails.push(r.status() + ' ' + r.url()); }); p.on('requestfailed', r => { if (/localhost/.test(r.url())) fails.push('failed ' + r.failure()?.errorText + ' ' + r.url()); });
const out = {};
for (const path of ['/mechanics', '/blog-press']) { await p.goto(base + path); await settle(p, 2500); out[path] = await p.evaluate(() => [...document.querySelectorAll('main img')].filter(i => i.complete && i.naturalWidth === 0).map(i => ({ alt: i.alt, src: i.currentSrc || i.src, srcset: (i.srcset || '').slice(0, 120), parent: i.parentElement.tagName + '.' + i.parentElement.className }))); }
out.fails = fails; save('broken-images.json', out); console.log(JSON.stringify(out, null, 1)); await b.close();
