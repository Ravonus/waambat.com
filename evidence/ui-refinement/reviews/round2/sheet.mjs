// node sheet.mjs out.png cols scale file...  -> contact sheet
import { sharp } from './lib.mjs';
const [outFile, cols, scale, ...files] = process.argv.slice(2);
const metas = await Promise.all(files.map(f => sharp(f).metadata()));
const w = Math.round(metas[0].width * +scale), h = Math.round(metas[0].height * +scale), c = +cols;
const comps = await Promise.all(files.map(async (f, i) => ({ input: await sharp(f).resize(w, h).toBuffer(), left: (i % c) * (w + 6), top: Math.floor(i / c) * (h + 6) })));
await sharp({ create: { width: c * (w + 6), height: Math.ceil(files.length / c) * (h + 6), channels: 3, background: '#444' } }).composite(comps).png().toFile(outFile);
