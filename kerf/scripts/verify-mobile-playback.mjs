// Run with an installed Playwright + WebKit. PLAYWRIGHT_MODULE may point to an
// external Playwright index.mjs so verification adds no runtime dependency.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {webkit} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.argv[2] || 'http://localhost:3287';
const results = [];
const browser = await webkit.launch({headless: true});
try {
  for (const mode of ['managed-cold-start', 'pending-posters', 'blocked-autoplay']) {
    const context = await browser.newContext({
      viewport: {width: 390, height: 844}, deviceScaleFactor: 3,
      isMobile: true, hasTouch: true, reducedMotion: 'no-preference',
    });
    const page = await context.newPage(), errors = [], pendingPosters = [];
    page.on('pageerror', error => errors.push(error.message));
    // Production headers stay intact. Local HTTP has no TLS endpoint for WebKit's
    // upgrade-insecure-requests; remove just that directive on local documents.
    if (new URL(origin).hostname === 'localhost') await page.route('**/*', async route => {
      if (route.request().resourceType() !== 'document') return route.continue();
      const response = await route.fetch(), headers = response.headers();
      if (headers['content-security-policy']) headers['content-security-policy'] =
        headers['content-security-policy'].replace(/;?\s*upgrade-insecure-requests/g, '');
      await route.fulfill({response, headers});
    });
    if (mode === 'pending-posters') await page.route('**/display-previews/**', route => {
      pendingPosters.push(route);
    });
    await page.addInitScript(mode => {
      Object.defineProperty(window, 'MediaSource', {value: undefined, configurable: true});
      window.__mobilePlayback = {managed: 0, blocked: 0};
      if (mode === 'managed-cold-start') {
        const Original = window.ManagedMediaSource;
        if (!Original) throw new Error('This check requires WebKit ManagedMediaSource');
        class ColdSource extends Original {
          constructor(...args) {super(...args); window.__mobilePlayback.managed++;}
          addEventListener(type, ...args) {
            if (type !== 'sourceopen' && type !== 'startstreaming')
              return super.addEventListener(type, ...args);
          }
        }
        Object.defineProperty(window, 'ManagedMediaSource', {value: ColdSource, configurable: true});
      } else if (mode === 'blocked-autoplay') {
        const allowed = new WeakSet(), play = HTMLMediaElement.prototype.play;
        const autoplay = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'autoplay');
        const scope = node => node?.closest('[data-hero], article.original-artwork');
        // Block the native autoplay hint too, so the test models a browser policy
        // restriction rather than merely replacing the app's scripted play calls.
        Object.defineProperty(HTMLMediaElement.prototype, 'autoplay', {...autoplay, set(value) {
          autoplay.set.call(this, value && allowed.has(scope(this)));
        }});
        addEventListener('pointerdown', event => {
          const target = scope(event.target); if (target) allowed.add(target);
        }, true);
        HTMLMediaElement.prototype.play = function (...args) {
          if (!allowed.has(scope(this))) {
            window.__mobilePlayback.blocked++;
            return Promise.reject(new DOMException('Autoplay blocked for regression check', 'NotAllowedError'));
          }
          return play.apply(this, args);
        };
      }
    }, mode);
    await page.goto(origin, {waitUntil: 'domcontentloaded'});
    const read = selector => page.locator(selector).first().evaluate(video => ({
      source: video.currentSrc, delivery: video.dataset.delivery,
      time: video.currentTime, paused: video.paused, ready: video.readyState,
      width: video.videoWidth, height: video.videoHeight, muted: video.muted,
      defaultMuted: video.defaultMuted, inline: video.playsInline, autoplay: video.autoplay,
    }));
    const check = async (selector, container) => {
      await page.locator(selector).first().waitFor();
      if (mode === 'blocked-autoplay') {
        await page.waitForFunction(selector => document.querySelector(selector)?.dataset.delivery === 'native-hls', selector);
        assert.equal((await read(selector)).time, 0, 'Autoplay must be blocked in this scenario');
        await page.locator(container).first().getByRole('button', {name: /^Play /}).click();
      }
      await page.waitForFunction(selector => {
        const v = document.querySelector(selector);
        return v && v.currentTime > .15 && !v.paused && v.readyState >= 2;
      }, selector);
      const state = await read(selector);
      assert.equal(state.delivery, 'native-hls');
      assert.ok(state.source.endsWith('.m3u8'));
      assert.ok(state.width >= 640 && state.height >= 640, 'Keep the sharp rendition');
      assert.ok(state.muted && state.inline);
      assert.ok(state.defaultMuted);
      if (mode !== 'blocked-autoplay') assert.ok(state.autoplay);
      return state;
    };
    const hero = await check('[data-hero] video', '[data-hero]');
    await page.locator('article.original-artwork').first().scrollIntoViewIfNeeded();
    const gallery = await check('article.original-artwork video', 'article.original-artwork');
    const counters = await page.evaluate(() => window.__mobilePlayback);
    assert.equal(counters.managed, 0, 'Managed-only iPhones must bypass the stalled JS transport');
    assert.deepEqual(errors, []);
    if (mode === 'pending-posters') assert.ok(pendingPosters.length > 0);
    results.push({mode, hero, gallery, counters, pendingPosters: pendingPosters.length});
    await Promise.allSettled(pendingPosters.map(route => route.abort()));
    await context.unrouteAll({behavior: 'ignoreErrors'});
    await context.close();
  }
  await fs.mkdir('.kerf/audit', {recursive: true});
  await fs.writeFile('.kerf/audit/mobile-playback.json', JSON.stringify({origin, results}, null, 2) + '\n');
  console.log(JSON.stringify({ok: true, scenarios: results.map(result => result.mode)}));
} finally {
  for (const context of browser.contexts()) await context.unrouteAll({behavior: 'ignoreErrors'});
  await browser.close();
}
