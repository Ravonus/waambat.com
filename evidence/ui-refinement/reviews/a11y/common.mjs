import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const { chromium } = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
export const AXE = '/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/axe-core@4.14.0/node_modules/axe-core/axe.min.js';
export const BASE = 'http://localhost:3287';
export const PAGES = ['/', '/ordinals', '/mechanics', '/art-by-waambat', '/instagram', '/blog-press', '/bio-waambat', '/contact-waambat'];
export const OUT = new URL('./', import.meta.url).pathname;
export const name = (p) => (p === '/' ? 'home' : p.slice(1));
const ch = (hex) => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255);
const lin = v => v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4;
export const lum = hex => { const [r,g,b] = ch(hex).map(lin); return 0.2126*r+0.7152*g+0.0722*b; };
export const cr = (a,b) => { const x=lum(a), y=lum(b); return +((Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)).toFixed(2); };
export function rgbToHex(s) { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return s; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return '#'+p.slice(0,3).map(v=>Math.round(v).toString(16).padStart(2,'0')).join('') + (p[3]!==undefined && p[3]<1 ? `@${p[3]}` : ''); }
