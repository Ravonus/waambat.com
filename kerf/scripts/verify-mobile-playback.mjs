// Run with an installed Playwright + WebKit. PLAYWRIGHT_MODULE may point to an
// external Playwright index.mjs so verification adds no runtime dependency.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {webkit} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.argv[2] || 'http://localhost:3287';
const results = [];
const browser = await webkit.launch({headless: true});
try {
  for (const mode of ['managed-cold-start', 'pending-posters', 'blocked-autoplay', 'initial-scroll', 'deferred-frame-callback', 'native-prestart-pause', 'pending-master', 'classic-cold-start']) {
    const context = await browser.newContext({
      viewport: {width: 390, height: 844}, deviceScaleFactor: 3,
      isMobile: true, hasTouch: true, reducedMotion: 'no-preference',
      ignoreHTTPSErrors: new URL(origin).hostname === 'localhost' && new URL(origin).protocol === 'https:',
    });
    const page = await context.newPage(), errors = [], pendingPosters = [];
    page.on('pageerror', error => errors.push(error.message));
    // Production headers stay intact. Local HTTP has no TLS endpoint for WebKit's
    // upgrade-insecure-requests; remove just that directive on local documents.
    if (new URL(origin).hostname === 'localhost' && new URL(origin).protocol === 'http:') await page.route('**/*', async route => {
      if (route.request().resourceType() !== 'document') return route.continue();
      const response = await route.fetch(), headers = response.headers();
      if (headers['content-security-policy']) headers['content-security-policy'] =
        headers['content-security-policy'].replace(/;?\s*upgrade-insecure-requests/g, '');
      await route.fulfill({response, headers});
    });
    if (mode === 'pending-master') await page.route('**/streams/**/master.m3u8', route => { pendingPosters.push(route); });
    if (mode === 'pending-posters') await page.route(/\/(?:display-previews|video-previews|media-optimized)\/(?:first|preview)-/, route => {
      pendingPosters.push(route);
    });
    await page.addInitScript(mode => {
      if (mode !== 'classic-cold-start') Object.defineProperty(window, 'MediaSource', {value: undefined, configurable: true});
      if (mode === 'deferred-frame-callback') {
        let id = 0; HTMLVideoElement.prototype.requestVideoFrameCallback = function () {return ++id;};
        HTMLVideoElement.prototype.cancelVideoFrameCallback = function () {};
      }
      if (mode === 'native-prestart-pause') {
        const hint = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'autoplay');
        Object.defineProperty(HTMLMediaElement.prototype, 'autoplay', {...hint, set() {hint.set.call(this, false);}});
      }
      window.__mobilePlayback = {managed: 0, blocked: 0};
      if (mode === 'managed-cold-start' || mode === 'classic-cold-start') {
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
      assert.equal(state.delivery, mode === 'classic-cold-start' ? 'adaptive-hls' : 'native-hls');
      assert.ok(mode === 'classic-cold-start' ? state.source.startsWith('blob:') : state.source.endsWith('.m3u8'));
      assert.ok(state.width >= 640 && state.height >= 640, 'Keep the sharp rendition');
      assert.ok(state.muted && state.inline);
      assert.ok(state.defaultMuted);
      if (mode !== 'blocked-autoplay' && mode !== 'native-prestart-pause') assert.ok(state.autoplay);
      await page.waitForFunction(container => {
        const el = document.querySelector(container), picture = el?.querySelector('picture');
        return picture && getComputedStyle(picture).opacity === '0';
      }, container);
      return state;
    };
    const hero = await check('[data-hero] video', '[data-hero]');
    await page.locator('article.original-artwork').first().scrollIntoViewIfNeeded();
    const gallery = await check('article.original-artwork video', 'article.original-artwork');
    let restored;
    if (mode === 'initial-scroll') {
      await page.waitForLoadState('load');
      const card = page.locator('article.original-artwork[data-media-start]').nth(5);
      const id = await card.getAttribute('data-artwork');
      await card.locator('.artwork-media').evaluate(element => {
        const box = element.getBoundingClientRect();
        scrollTo({top: scrollY + box.top - innerHeight + box.height * .35, behavior: 'instant'});
      });
      await page.waitForFunction(id => {
        const video = document.querySelector(`[data-artwork="${id}"] video`);
        return video && !video.paused && video.currentTime > .15;
      }, id);
      const position = await page.evaluate(() => scrollY);
      // Seed the saved offset before first paint. Automation WebKit can reset
      // native history offsets on reload; this case tests player startup at the
      // existing viewport, without any post-load pointer or scroll interaction.
      await page.addInitScript(top => addEventListener('DOMContentLoaded', () => {
        scrollTo({top, behavior:'instant'});
      }, {once:true}), position);
      await page.reload({waitUntil: 'domcontentloaded'});
      // No scrolling or clicks after reload: the initial viewport must be enough.
      await page.waitForFunction(({id, position}) => {
        const video = document.querySelector(`[data-artwork="${id}"] video`);
        return Math.abs(scrollY - position) < 32 && video && !video.paused && video.currentTime > .15;
      }, {id, position});
      restored = await read(`[data-artwork="${id}"] video`);
      assert.equal(restored.delivery, 'native-hls');
      assert.ok(restored.autoplay && restored.muted && restored.inline);
    }
    if (mode === 'native-prestart-pause') {
      const card = page.locator('article.original-artwork[data-media-start]').nth(5);
      await card.locator('.artwork-media').evaluate(el => {const b = el.getBoundingClientRect(); scrollTo({top: scrollY + b.top - innerHeight - 24, behavior: 'instant'});});
      // Native WebKit may already have paused the predicted offscreen start.
      await page.waitForFunction(el => {const v=el.querySelector('video');return v && v.readyState >= 2;}, await card.elementHandle());
      await card.locator('video').evaluate(v => v.pause());
      await card.scrollIntoViewIfNeeded();
      await page.waitForFunction(el => {const v=el.querySelector('video');return !v.paused && v.currentTime > .15;}, await card.elementHandle());
      // A browser-level pause on a restored page also needs a retry without changing visibility.
      await card.locator('video').evaluate(v => v.pause());
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true})));
      await page.waitForFunction(el => !el.querySelector('video').paused, await card.elementHandle());
      await card.getByRole('button', {name: /^Pause /}).click();
      await page.waitForFunction(el => el.querySelector('video').paused, await card.elementHandle());
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true})));
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      assert.equal(await card.locator('video').evaluate(v => v.paused), true, 'An explicit Pause stays authoritative after page restoration');
    }
    const counters = await page.evaluate(() => window.__mobilePlayback);
    assert.equal(counters.managed, 0, 'Managed-only iPhones must bypass the stalled JS transport');
    assert.deepEqual(errors, []);
    if (mode === 'pending-posters') assert.ok(pendingPosters.length > 0);
    results.push({mode, hero, gallery, restored, counters, pendingPosters: pendingPosters.length});
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
