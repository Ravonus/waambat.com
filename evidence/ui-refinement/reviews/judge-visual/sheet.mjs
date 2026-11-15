// Side-by-side before | now sheets for visual review.
import { sharp, shots } from './lib.mjs';
import fs from 'node:fs';
const before = new URL('../../before/', import.meta.url).pathname;
fs.mkdirSync(shots + (process.env.CMP || 'cmp'), { recursive: true });
const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(shots + (process.env.NOW || 'now')).filter(f => f.endsWith('.png'));
for (const f of files) {
  if (!fs.existsSync(before + f)) continue;
  const a = sharp(before + f), bm = await a.metadata();
  const n = sharp(shots + (process.env.NOW || 'now') + '/' + f), nm = await n.metadata();
  const w = bm.width + nm.width + 20, h = Math.max(bm.height, nm.height);
  await sharp({ create: { width: w, height: h, channels: 3, background: '#3a3a3a' } }).composite([{ input: before + f, left: 0, top: 0 }, { input: shots + (process.env.NOW || 'now') + '/' + f, left: bm.width + 20, top: 0 }]).png().toFile(shots + (process.env.CMP || 'cmp') + '/' + f);
}
console.log('ok', files.length);
