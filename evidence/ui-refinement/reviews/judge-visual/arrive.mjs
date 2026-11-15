// Freeze the h1 title-arrive animation at 300ms and capture the fringe colours.
import { chromium, guard, go, shots, sharp, toHex } from './lib.mjs';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' }); await guard(ctx);
const p = await ctx.newPage(); await go(p, '/contact-waambat', 0); await p.waitForSelector('main h1');
await p.evaluate(() => { for (const a of document.getAnimations()) if (/title-arrive/.test(a.animationName)) { a.pause(); a.currentTime = 300; } });
await p.waitForTimeout(100);
const h = await p.locator('main h1').first().boundingBox();
const buf = await p.screenshot({ clip: { x: h.x - 6, y: h.y - 4, width: 300, height: h.height + 8 } });
await sharp(buf).toFile(shots + 'title-arrive-300ms.png');
const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
let violet = 0, coral = 0; for (let i = 0; i < data.length; i += info.channels) { const [r, g, bl] = [data[i], data[i + 1], data[i + 2]]; if (bl > r + 20 && bl > 120 && g < 120) violet++; if (r > 180 && g < 130 && bl < 130 && r - bl > 80) coral++; }
console.log(JSON.stringify({ shadow: await p.evaluate(() => getComputedStyle(document.querySelector('main h1')).textShadow), violetPx: violet, coralPx: coral }));
await b.close();
