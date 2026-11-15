// node crop.mjs <file> x y w h [scale] -> stacks before (top) and after (bottom) crops into reviews/visual/crops/
import { createRequire } from 'node:module'; import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const sharp = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/sharp@0.35.5_@types+node@26.6.6/node_modules/sharp');
const root = '/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/waambat/evidence/ui-refinement/';
const [f, x, y, w, h, s = '1'] = process.argv.slice(2); const [X, Y, W, H, S] = [x, y, w, h, s].map(Number);
mkdirSync(root + 'reviews/visual/crops', { recursive: true });
const c = async (d) => sharp(root + d + '/' + f).extract({ left: X, top: Y, width: W, height: H }).resize(Math.round(W * S), Math.round(H * S), { kernel: 'nearest' }).png().toBuffer();
const a = await c('before'), b = await c('after');
const out = root + `reviews/visual/crops/${f.replace('.png', '')}-${X}-${Y}.png`;
await sharp({ create: { width: Math.round(W * S), height: Math.round(H * S) * 2 + 6, channels: 3, background: '#00ff00' } }).composite([{ input: a, top: 0, left: 0 }, { input: b, top: Math.round(H * S) + 6, left: 0 }]).png().toFile(out);
console.log(out);
