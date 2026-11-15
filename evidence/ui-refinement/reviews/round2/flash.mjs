// WCAG 2.3.1 general-flash estimate from real rendered frames (CDP screencast, PNG).
// A "transition" at a pixel is a change in relative luminance of >= 0.10 where the darker state is < 0.80.
// A flash is a pair of opposing transitions. We report, per scenario, the largest number of flashes any pixel shows in
// any 1 s window, and the area of pixels with more than 3 flashes in 1 s (device px, and as a share of the
// WCAG 10-degree field: 341x256 px at 1024x768, scaled to the device screen).
import { chromium, base, shots, save, guard, settle, sharp } from './lib.mjs';
import fs from 'node:fs';
const b = await chromium.launch();
const R = {};
async function record(page, cdp, ms, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const frames = [];
  cdp.on('Page.screencastFrame', async f => { frames.push({ t: f.metadata.timestamp * 1000, data: f.data }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => { }); });
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  return async () => { await page.waitForTimeout(ms); await cdp.send('Page.stopScreencast'); cdp.removeAllListeners('Page.screencastFrame'); return frames; };
}
const L = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
async function analyse(frames, name, screen, region = null) {
  if (frames.length < 3) return { frames: frames.length };
  const imgs = [];
  for (const f of frames) { let im = sharp(Buffer.from(f.data, 'base64')); if (region) im = im.extract(region); const { data, info } = await im.removeAlpha().raw().toBuffer({ resolveWithObject: true }); imgs.push({ t: f.t, data, w: info.width, h: info.height }); }
  const { w, h } = imgs[0]; const n = w * h;
  const t0 = imgs[0].t;
  // per-pixel transition timestamps
  const last = new Float32Array(n), lastDir = new Int8Array(n), trans = Array.from({ length: n }, () => null);
  for (let p = 0; p < n; p++) { const d = imgs[0].data; last[p] = 0.2126 * L(d[p * 3]) + 0.7152 * L(d[p * 3 + 1]) + 0.0722 * L(d[p * 3 + 2]); }
  for (let k = 1; k < imgs.length; k++) {
    const d = imgs[k].data; if (imgs[k].w !== w) continue;
    for (let p = 0; p < n; p++) {
      const y = 0.2126 * L(d[p * 3]) + 0.7152 * L(d[p * 3 + 1]) + 0.0722 * L(d[p * 3 + 2]);
      const dy = y - last[p];
      if (Math.abs(dy) >= 0.1 && Math.min(y, last[p]) < 0.8) {
        const dir = dy > 0 ? 1 : -1;
        if (dir !== lastDir[p]) { (trans[p] ||= []).push(imgs[k].t - t0); lastDir[p] = dir; }
        last[p] = y;
      }
    }
  }
  // max flashes per pixel in any 1s window
  let maxF = 0; const over = new Uint8Array(n); let overCount = 0, anyChange = 0;
  for (let p = 0; p < n; p++) {
    const ts = trans[p]; if (!ts) continue; anyChange++;
    let best = 0; for (let i = 0, j = 0; j < ts.length; j++) { while (ts[j] - ts[i] > 1000) i++; best = Math.max(best, j - i + 1); }
    const flashes = Math.floor(best / 2); maxF = Math.max(maxF, flashes);
    if (flashes > 3) { over[p] = 1; overCount++; }
  }
  // largest count of over-threshold pixels inside any 10-degree window (scaled)
  const scale = Math.sqrt((screen.w * screen.h) / (1024 * 768));
  const fw = Math.round(341 * scale), fh = Math.round(256 * scale);
  let bestWin = 0;
  if (overCount) {
    const ii = new Int32Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) ii[(y + 1) * (w + 1) + x + 1] = over[y * w + x] + ii[y * (w + 1) + x + 1] + ii[(y + 1) * (w + 1) + x] - ii[y * (w + 1) + x];
    const ww = Math.min(fw, w), hh = Math.min(fh, h);
    for (let y = 0; y + hh <= h; y += 4) for (let x = 0; x + ww <= w; x += 4) { const s = ii[(y + hh) * (w + 1) + x + ww] - ii[y * (w + 1) + x + ww] - ii[(y + hh) * (w + 1) + x] + ii[y * (w + 1) + x]; if (s > bestWin) bestWin = s; }
  }
  // save a heat mask
  const mask = Buffer.alloc(n * 3);
  for (let p = 0; p < n; p++) { const c = trans[p] ? Math.min(255, trans[p].length * 30) : 0; mask[p * 3] = c; mask[p * 3 + 1] = over[p] ? 255 : 0; mask[p * 3 + 2] = 0; }
  await sharp(mask, { raw: { width: w, height: h, channels: 3 } }).png().toFile(shots + `flash-${name}-mask.png`);
  const span = imgs.at(-1).t - t0;
  return { frames: imgs.length, spanMs: Math.round(span), fps: +(imgs.length / (span / 1000)).toFixed(1), frameSize: [w, h], pixelsChanging: anyChange, maxFlashesPerPixelIn1s: maxF, pixelsOver3FlashesPerSec: overCount, tenDegreeField: [fw, fh], worstFieldPixelsOver3: bestWin, worstFieldShare: +(bestWin / (fw * fh)).toFixed(4), thresholdShare: 0.25 };
}
async function scenario(name, ctxOpts, path, action, ms, screen, region = null) {
  const ctx = await b.newContext({ ...ctxOpts, colorScheme: 'dark' }); await guard(ctx);
  const page = await ctx.newPage(); await page.goto(base + path); await settle(page, 1500);
  const cdp = await ctx.newCDPSession(page);
  const setup = await action.setup?.(page);
  const stop = await record(page, cdp, ms, shots);
  await action.run(page, setup);
  const frames = await stop();
  R[name] = await analyse(frames, name, screen, region); if (region) R[name].region = region;
  // keep two sample frames for the record
  if (frames.length > 6) for (const k of [2, Math.floor(frames.length / 3)]) fs.writeFileSync(shots + `flash-${name}-frame${k}.png`, Buffer.from(frames[k].data, 'base64'));
  console.log(name, JSON.stringify(R[name]));
  await ctx.close();
}
const hoverAt = (sel, idx = 0, fy = 0.5, menu = false) => ({
  setup: async page => { if (menu) { await page.locator('header button[aria-label="Menu"]').click(); await page.waitForTimeout(1200); } const l = page.locator(sel).nth(idx); await l.scrollIntoViewIfNeeded(); await page.waitForTimeout(1000); await page.mouse.move(2, 2); await page.waitForTimeout(300); return l.boundingBox(); },
  run: async (page, bb) => { await page.mouse.move(bb.x + bb.width * 0.4, bb.y + bb.height * fy); },
});
if (process.env.ONLY !== '2') await scenario('nav-hover-rest', { viewport: { width: 1440, height: 900 } }, '/contact-waambat', hoverAt('header nav a', 3), 2200, { w: 1440, h: 900 }, { left: 0, top: 0, width: 1440, height: 300 });

const wheel = { run: async page => { await page.mouse.move(700, 450); for (let i = 0; i < 20; i++) { await page.mouse.wheel(0, 260); await page.waitForTimeout(90); } } };
if (process.env.ONLY === '2') {
  await scenario('rail-scroll-1440', { viewport: { width: 1440, height: 900 } }, '/', wheel, 2400, { w: 1440, h: 900 }, { left: 1380, top: 0, width: 60, height: 900 });
  await scenario('hero-wordmark-hover', { viewport: { width: 1440, height: 900 } }, '/', hoverAt('[data-hero-wordmark] a', 0), 2200, { w: 1440, h: 900 }, { left: 0, top: 300, width: 600, height: 300 });
}
if (!process.env.ONLY) await scenario('caption-hover-rest', { viewport: { width: 1440, height: 900 } }, '/', hoverAt('.original-artwork .artwork-caption h2 a', 0), 2200, { w: 1440, h: 900 });
if (!process.env.ONLY) await scenario('zoom200-menu-link-rest', { viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 }, '/mechanics', hoverAt('#mobile-site-menu nav a', 3, 0.5, true), 2200, { w: 1440, h: 900 });
if (!process.env.ONLY) await scenario('menu-open-390', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, '/mechanics', { run: async page => { await page.locator('header button[aria-label="Menu"]').tap(); } }, 1400, { w: 390, h: 844 });
if (!process.env.ONLY) await scenario('menu-close-390', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, '/mechanics', { setup: async page => { await page.locator('header button[aria-label="Menu"]').tap(); await page.waitForTimeout(1200); }, run: async page => { await page.locator('button[aria-label="Close menu"]').tap(); } }, 900, { w: 390, h: 844 });
const prev = process.env.ONLY ? JSON.parse(fs.readFileSync(new URL('./flash.json', import.meta.url))) : {}; save('flash.json', { ...prev, ...R });
await b.close();
