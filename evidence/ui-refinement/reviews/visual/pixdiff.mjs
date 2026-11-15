// Pairwise before/after diff: size, changed-pixel count, bounding boxes, and whether changes are hue-only.
import { createRequire } from 'node:module';
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const sharp = require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/sharp@0.35.5_@types+node@26.6.6/node_modules/sharp');
const root = '/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/waambat/evidence/ui-refinement/';
const outDir = root + 'reviews/visual/diff/'; mkdirSync(outDir, { recursive: true });
const files = readdirSync(root + 'before').filter(f => f.endsWith('.png'));
const rows = [];
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
for (const f of files) {
  const A = await sharp(root + 'before/' + f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const B = await sharp(root + 'after/' + f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const row = { f, before: `${A.info.width}x${A.info.height}`, after: `${B.info.width}x${B.info.height}` };
  if (row.before !== row.after) { row.sizeMismatch = true; rows.push(row); continue; }
  const { width: w, height: h } = A.info; const a = A.data, b = B.data;
  const mask = Buffer.alloc(w * h * 4);
  let changed = 0, chroma = 0, luma = 0; let x0 = w, y0 = h, x1 = -1, y1 = -1;
  // track bands of changed rows to report regions
  const rowCount = new Uint32Array(h);
  for (let i = 0, p = 0; p < w * h; p++, i += 4) {
    const dr = Math.abs(a[i] - b[i]), dg = Math.abs(a[i + 1] - b[i + 1]), db = Math.abs(a[i + 2] - b[i + 2]);
    const d = Math.max(dr, dg, db);
    if (d > 24) {
      changed++; rowCount[(p / w) | 0]++;
      const x = p % w, y = (p / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      const la = lum(a[i], a[i + 1], a[i + 2]), lb = lum(b[i], b[i + 1], b[i + 2]);
      // "colour-only": pixel was or is lit in both (same coverage, different hue); "coverage": dark<->lit (geometry/content)
      const litA = la > 40, litB = lb > 40;
      if (litA === litB) chroma++; else luma++;
      mask[i] = 255; mask[i + 1] = litA === litB ? 200 : 0; mask[i + 2] = 0; mask[i + 3] = 255;
    } else { const g = (a[i] + a[i + 1] + a[i + 2]) / 12; mask[i] = mask[i + 1] = mask[i + 2] = g; mask[i + 3] = 255; }
  }
  // changed row bands
  const bands = []; let start = -1;
  for (let y = 0; y <= h; y++) { const on = y < h && rowCount[y] > 0; if (on && start < 0) start = y; if (!on && start >= 0) { bands.push([start, y - 1]); start = -1; } }
  Object.assign(row, { changed, pct: +(100 * changed / (w * h)).toFixed(3), sameCoverage: chroma, coverageFlip: luma, bbox: changed ? [x0, y0, x1, y1] : null, bands: bands.slice(0, 12) });
  if (changed) await sharp(mask, { raw: { width: w, height: h, channels: 4 } }).png().toFile(outDir + f);
  rows.push(row);
}
writeFileSync(outDir + 'summary.json', JSON.stringify(rows, null, 1));
for (const r of rows) console.log(r.f.padEnd(42), r.sizeMismatch ? `SIZE ${r.before} -> ${r.after}` : `${r.pct}% chg=${r.changed} hue=${r.sameCoverage} cov=${r.coverageFlip} bbox=${JSON.stringify(r.bbox)} bands=${JSON.stringify(r.bands.slice(0,6))}`);
