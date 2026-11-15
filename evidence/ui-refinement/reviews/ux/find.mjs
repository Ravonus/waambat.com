import { chromium, base } from './lib.mjs';
const b = await chromium.launch();
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
for (const p of ['/', '/ordinals', '/mechanics', '/art-by-waambat', '/instagram', '/blog-press', '/bio-waambat', '/contact-waambat']) {
  await page.goto(base + p, { waitUntil: 'load' }); await page.waitForTimeout(1500);
  console.log(p, JSON.stringify(await page.evaluate(() => ({ iframes: [...document.querySelectorAll('iframe')].map(f => [f.src.slice(0, 50), Math.round(f.getBoundingClientRect().height), Math.round(f.getBoundingClientRect().top + scrollY)]), videosControls: document.querySelectorAll('video[controls]').length, videos: document.querySelectorAll('video').length, mediaControls: document.querySelectorAll('.media-control').length, expand: document.querySelectorAll('.archive-expand').length, ordinal: document.querySelectorAll('[class*=action], .ordinal-gate').length, h: document.documentElement.scrollHeight }))));
}
await b.close();
