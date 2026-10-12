#!/usr/bin/env node
// Real-time capture of an Ordinals WebGL piece (LUX). These inscriptions need their own clock and a real
// GPU: Keel's deterministic fake-clock web adapter never sees LUX become ready, and software GL is too slow
// to capture a frame per tick. So this records what a visitor with a GPU sees, with timestamps, and
// encode-captures.sh resamples it to constant frame rate.
//
//   node keel/hero/capture-ordinals.mjs <url> <outDir> [width=960] [height=960] [warmMs=18000] [durationMs=28000]
//
// macOS uses ANGLE/Metal. On other platforms drop the --use-angle flag. CHROMIUM_PATH selects a browser.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium } = require('playwright');
const [, , url, outDir, w = '960', h = '960', warm = '18000', dur = '28000'] = process.argv;
if (!url || !outDir) { console.error('usage: capture-ordinals.mjs <url> <outDir> [w] [h] [warmMs] [durMs]'); process.exit(2); }
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: [process.platform === 'darwin' ? '--use-angle=metal' : '--use-angle=default', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(+warm);
const start = Date.now();
const stamps = [];
for (let i = 0; Date.now() - start < +dur; i++) {
  const t = Date.now() - start;
  await page.screenshot({ path: `${outDir}/f${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 95 });
  stamps.push([i, t]);
}
writeFileSync(`${outDir}/stamps.json`, JSON.stringify(stamps));
console.log(JSON.stringify({ frames: stamps.length, seconds: (Date.now() - start) / 1000 }));
await browser.close();
