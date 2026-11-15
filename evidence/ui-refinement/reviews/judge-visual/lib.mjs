// Judge-visual helpers. Read-only against the live preview: no POSTs, no originals, no admin login.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
export const { chromium } = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
export const sharp = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/sharp@0.35.5_@types+node@26.6.6/node_modules/sharp');
export const AXE = '/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/axe-core@4.14.0/node_modules/axe-core/axe.min.js';
export const base = 'http://localhost:3287';
export const out = new URL('./', import.meta.url).pathname;
export const shots = out + (process.env.SHOTS || 'shots') + '/';
fs.mkdirSync(shots, { recursive: true });
export const pages = ['/', '/ordinals', '/mechanics', '/art-by-waambat', '/instagram', '/blog-press', '/bio-waambat', '/contact-waambat'];
export const pname = p => (p === '/' ? 'home' : p.slice(1));
export async function guard(ctx, log = []) {
  await ctx.route('**/*', route => {
    const r = route.request(), m = r.method(), u = r.url();
    if (m !== 'GET' && m !== 'HEAD') { log.push(`blocked ${m} ${u}`); return route.abort(); }
    if (/media-originals/.test(u)) { log.push(`blocked original ${u}`); return route.abort(); }
    return route.fallback();
  });
  return log;
}
export function watchConsole(page, sink, tag) {
  page.on('pageerror', e => sink.push({ tag, type: 'pageerror', text: e.message.slice(0, 300) }));
  page.on('console', m => { if (m.type() === 'error') sink.push({ tag, type: 'error', text: m.text().slice(0, 240) }); });
}
export const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
export const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
export const rgb = s => { const m = String(s).match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; };
export const toHex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
export function hue([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return { h: null, s: 0 }; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; const l = (mx + mn) / 2; return { h: Math.round(h), s: +(d / (1 - Math.abs(2 * l - 1))).toFixed(2), l: +l.toFixed(2) }; }
export function save(name, data) { fs.writeFileSync(out + name, JSON.stringify(data, null, 1)); }
export async function go(page, path, ms = 1500) { await page.goto(base + path, { waitUntil: 'load', timeout: 60000 }); await page.waitForTimeout(ms); }
