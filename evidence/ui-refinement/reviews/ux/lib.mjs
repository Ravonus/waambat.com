import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const { chromium } = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
export const base = 'http://localhost:3287';
export const out = new URL('./', import.meta.url).pathname;
export const log = [];
export function watchConsole(page, tag) {
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.push({ tag, type: m.type(), text: m.text().slice(0, 300) }); });
  page.on('pageerror', (e) => log.push({ tag, type: 'pageerror', text: e.message.slice(0, 300) }));
}
export const shot = (page, file, opts = {}) => page.screenshot({ path: out + file + '.png', ...opts });
export const css = (page, sel, props) => page.evaluate(([sel, props]) => { const el = typeof sel === 'string' ? document.querySelector(sel) : null; if (!el) return null; const s = getComputedStyle(el); return Object.fromEntries(props.map(p => [p, s.getPropertyValue(p)])); }, [sel, props]);
