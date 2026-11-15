// Shared helpers for the round-2 critic probes. Read-only against the live preview.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
export const { chromium } = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
export const sharp = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/sharp@0.35.5_@types+node@26.6.6/node_modules/sharp');
export const AXE = '/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/axe-core@4.14.0/node_modules/axe-core/axe.min.js';
export const base = 'http://localhost:3287';
export const out = new URL('./', import.meta.url).pathname;
export const shots = out + 'shots/';
fs.mkdirSync(shots, { recursive: true });
export const pages = ['/', '/ordinals', '/mechanics', '/art-by-waambat', '/instagram', '/blog-press', '/bio-waambat', '/contact-waambat'];

/** Never let a probe send a message or fetch an original. */
export async function guard(ctx, log = []) {
  await ctx.route('**/*', route => {
    const r = route.request(), m = r.method(), u = r.url();
    if (m !== 'GET' && m !== 'HEAD') { log.push(`blocked ${m} ${u}`); return route.abort(); }
    if (m === 'GET' && /media-originals/.test(u)) { log.push(`blocked GET original ${u}`); return route.abort(); }
    return route.fallback();
  });
  return log;
}
export function watchConsole(page, sink, tag) {
  page.on('pageerror', e => sink.push({ tag, type: 'pageerror', text: e.message }));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') sink.push({ tag, type: m.type(), text: m.text().slice(0, 300) }); });
}
export const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
export const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
export const hex = s => { const m = s.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; };
export const toHex = rgb => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
export function save(name, data) { fs.writeFileSync(out + name, JSON.stringify(data, null, 1)); }
export async function settle(page, ms = 1200) { await page.waitForLoadState('load'); await page.waitForTimeout(ms); }
/** Pause every running animation and seek them all to t ms after their own start. */
export async function freezeAt(page, t, filter = null) {
  return page.evaluate(([t, filter]) => {
    const list = document.getAnimations().filter(a => !filter || (a.animationName && new RegExp(filter).test(a.animationName)));
    for (const a of list) { a.pause(); a.currentTime = t; }
    return list.map(a => a.animationName || a.constructor.name);
  }, [t, filter]);
}
