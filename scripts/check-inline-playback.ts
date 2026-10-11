import { chromium } from "playwright";
import { spawn, execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
const origin = "http://localhost:3102";
const folder = await mkdtemp(join(tmpdir(), "waambat-inline-"));
const movie = join(folder, "movie.mp4");
execFileSync("ffmpeg", [
  "-loglevel",
  "error",
  "-f",
  "lavfi",
  "-i",
  "testsrc2=size=320x240:rate=15",
  "-t",
  "30",
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  "-an",
  movie,
]);
const bytes = await readFile(movie);
const child = spawn(
  "node",
  ["node_modules/next/dist/bin/next", "dev", "-p", "3102"],
  {
    env: { ...process.env, WAAMBAT_PRIVATE_SITE: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
child.stdout.on("data", (d) => {
  logs += String(d);
});
child.stderr.on("data", (d) => {
  logs += String(d);
});
// Controlled remote transport with a real decoded MP4 inside each cross-origin
// iframe. Vimeo runs its actual shipped SDK. YouTube's remote API is replaced
// at the transport boundary. These checks do not prove upstream availability.
const providerHTML = `<!doctype html><style>html,body{margin:0;background:#000}video{width:100vw;height:100vh;object-fit:contain}</style><video muted loop playsinline src="https://fixture.invalid/movie.mp4"></video><script>
const video=document.querySelector('video');
const emit=(data)=>parent.postMessage(data,'*');
video.addEventListener('play',()=>{emit({event:'play',data:{}});emit({fixture:'yt',state:1});});
video.addEventListener('timeupdate',()=>emit({fixture:'yttime',time:video.currentTime}));
video.addEventListener('pause',()=>{emit({event:'pause',data:{}});emit({fixture:'yt',state:2});});
addEventListener('message',async e=>{const d=typeof e.data==='string'?JSON.parse(e.data):e.data;if(!d)return;if(d.method){let value=true;if(d.method==='play')await video.play();if(d.method==='pause')video.pause();if(d.method==='setMuted')video.muted=d.value;if(d.method==='getCurrentTime')value=video.currentTime;emit({method:d.method,value});}if(d.fixture==='ytcmd'){if(d.command==='play')await video.play();if(d.command==='pause')video.pause();if(d.command==='mute')video.muted=true;}});
emit({event:'ready'});emit({fixture:'ytready'});
</script>`;
const youtubeFixture = `window.YT={PlayerState:{PLAYING:1,ENDED:0},Player:class {constructor(frame,{events}){this.frame=frame;this.events=events;this.listener=e=>{if(e.source!==frame.contentWindow)return;if(e.data.fixture==='yttime')this.time=e.data.time;if(e.data.fixture==='yt')events.onStateChange?.({data:e.data.state});};addEventListener('message',this.listener);setTimeout(()=>events.onReady?.(),150);}command(command){this.frame.contentWindow?.postMessage({fixture:'ytcmd',command},'*');}mute(){this.command('mute');}playVideo(){this.command('play');}pauseVideo(){this.command('pause');}getCurrentTime(){return this.time||0;}destroy(){removeEventListener('message',this.listener);}}};window.onYouTubeIframeAPIReady?.();`;
let browser;
const evidence: Record<string, unknown> = {
  scope:
    "Real Chromium media decoding; controlled provider transport, not upstream acceptance",
};
try {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1512, height: 733 },
  });
  const requests: string[] = [];
  await context.route("https://www.youtube.com/iframe_api", (route) =>
    route.fulfill({
      body: youtubeFixture,
      contentType: "application/javascript",
    }),
  );
  await context.route(
    /https:\/\/(player\.vimeo\.com\/video\/|www\.youtube-nocookie\.com\/embed\/)/,
    async (route) => {
      requests.push(route.request().url());
      await route.fulfill({ body: providerHTML, contentType: "text/html" });
    },
  );
  await context.route("https://fixture.invalid/movie.mp4", (route) =>
    route.fulfill({ body: bytes, contentType: "video/mp4" }),
  );
  const page = await context.newPage();
  await mkdir("evidence", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${origin}/art-by-waambat`);
  const first = page.locator(".archive-tile").first();
  await first.locator('[data-playback-state="playing"]').waitFor();
  const nativeInFrame = first.frameLocator("iframe").locator("video");
  const time = () =>
    nativeInFrame.evaluate((el) => (el as HTMLVideoElement).currentTime);
  const before = await time();
  await page.waitForTimeout(800);
  assert.ok((await time()) > before + 0.4);
  await first.hover();
  await page.waitForTimeout(200);
  await page.screenshot({
    path: "evidence/archive-inline-desktop-fixture.png",
  });
  const providerSample = await first
    .locator(".inline-video")
    .evaluate(
      (el) =>
        new Promise<number | null>((resolve) =>
          el.dispatchEvent(
            new CustomEvent("waambat:inspect-playback", { detail: resolve }),
          ),
        ),
    );
  assert.ok(providerSample !== null && providerSample > before + 0.4);
  const iframeBefore = await first.locator("iframe").getAttribute("src");
  await page.evaluate(() => window.scrollTo(0, 2500));
  await first.locator('[data-playback-state="paused"]').waitFor();
  const paused = await time();
  await page.waitForTimeout(700);
  assert.ok(Math.abs((await time()) - paused) < 0.1);
  await first.scrollIntoViewIfNeeded();
  await first.locator('[data-playback-state="playing"]').waitFor();
  const resumed = await time();
  assert.ok(resumed >= paused);
  await page.waitForTimeout(500);
  assert.ok((await time()) > resumed + 0.2);
  assert.equal(await first.locator("iframe").getAttribute("src"), iframeBefore);
  assert.equal(requests.filter((u) => u.includes("538169390")).length, 1);
  await first
    .getByRole("button", { name: "Pause Axiom GL0w Up (2021)" })
    .click();
  await first.locator('[data-playback-state="paused"]').waitFor();
  await page.evaluate(() => window.scrollTo(0, 2500));
  await first.scrollIntoViewIfNeeded();
  assert.equal(
    await first.locator('[data-playback-state="paused"]').count(),
    1,
  );
  await first
    .getByRole("button", { name: "Play Axiom GL0w Up (2021)" })
    .click();
  await first.locator('[data-playback-state="playing"]').waitFor();
  await first
    .getByRole("button", { name: "View Axiom GL0w Up (2021)" })
    .click();
  await first.locator('[data-playback-state="paused"]').waitFor();
  await page.getByRole("button", { name: "Close archive viewer" }).click();
  await first.locator('[data-playback-state="playing"]').waitFor();
  const yt = page.locator('[data-inline-provider="youtube"]').first();
  await yt.scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-inline-provider="youtube"]')
        ?.getAttribute("data-playback-state") === "playing",
  );
  const ytMovie = yt.frameLocator("iframe").locator("video");
  const ytStart = await ytMovie.evaluate(
    (el) => (el as HTMLVideoElement).currentTime,
  );
  await page.waitForTimeout(600);
  assert.ok(
    (await ytMovie.evaluate((el) => (el as HTMLVideoElement).currentTime)) >
      ytStart + 0.2,
  );
  await page.evaluate(() => window.scrollTo(0, 4500));
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-inline-provider="youtube"]')
        ?.getAttribute("data-playback-state") === "paused",
  );
  const ytPaused = await ytMovie.evaluate(
    (el) => (el as HTMLVideoElement).currentTime,
  );
  await page.waitForTimeout(500);
  assert.ok(
    Math.abs(
      (await ytMovie.evaluate((el) => (el as HTMLVideoElement).currentTime)) -
        ytPaused,
    ) < 0.1,
  );
  await yt.scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-inline-provider="youtube"]')
        ?.getAttribute("data-playback-state") === "playing",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-inline-provider="youtube"]')
        ?.getAttribute("data-playback-state") === "paused",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-inline-provider="youtube"]')
        ?.getAttribute("data-playback-state") === "playing",
  );
  const ytSample = await yt.evaluate(
    (el) =>
      new Promise<number | null>((resolve) =>
        el.dispatchEvent(
          new CustomEvent("waambat:inspect-playback", { detail: resolve }),
        ),
      ),
  );
  assert.ok(ytSample !== null && ytSample >= ytStart);
  evidence.archive = {
    vimeo: {
      timeAdvanced: true,
      offscreenPaused: true,
      resumedWithoutReload: true,
      explicitPauseSticky: true,
      fullscreenPaused: true,
    },
    youtube: {
      timeAdvanced: true,
      offscreenPaused: true,
      hiddenPaused: true,
      reentryResumed: true,
    },
    providerTimeSamples: { vimeo: providerSample, youtube: ytSample },
    requests: requests.length,
  };
  await page.goto(`${origin}/mechanics`);
  await page.locator("[data-cursor-ready]").waitFor({ state: "attached" });
  await page.mouse.move(150, 180);
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLElement>("[data-pink-cursor]")?.style
        .opacity === "1",
  );
  const span = page.locator("[data-pink-cursor] span");
  const gradientBefore = await span.evaluate(
    (el) => getComputedStyle(el).backgroundPosition,
  );
  const cursorBox = await span.boundingBox();
  assert.ok(cursorBox);
  const cursorPixelsBefore = await page.screenshot({
    clip: cursorBox,
    path: "evidence/cursor-gradient-0.png",
  });
  await page.waitForTimeout(400);
  assert.notEqual(
    await span.evaluate((el) => getComputedStyle(el).backgroundPosition),
    gradientBefore,
  );
  const cursorPixelsAfter = await page.screenshot({
    clip: cursorBox,
    path: "evidence/cursor-gradient-1.png",
  });
  assert.notDeepEqual(cursorPixelsAfter, cursorPixelsBefore);
  const nav = page.getByRole("link", { name: "bio", exact: true });
  await nav.hover();
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLElement>("[data-pink-cursor]")?.dataset
        .cursorState === "pointer",
  );
  await page.evaluate(() => {
    const b = document.createElement("button");
    b.disabled = true;
    b.style.cssText =
      "position:fixed;left:50px;top:250px;width:100px;height:50px";
    b.innerHTML = "<span>disabled</span>";
    document.body.append(b);
  });
  await page.mouse.move(80, 270);
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLElement>("[data-pink-cursor]")?.dataset
        .cursorState === "not-allowed",
  );
  await page.screenshot({ path: "evidence/cursor-disabled-desktop.png" });
  await page.evaluate(() => {
    const p = document.createElement("p");
    p.textContent = "selectable text";
    p.style.cssText =
      "position:fixed;left:50px;top:350px;width:100px;height:50px;cursor:text";
    document.body.append(p);
  });
  await page.mouse.move(80, 370);
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLElement>("[data-pink-cursor]")?.style
        .opacity === "0",
  );
  evidence.cursor = {
    arrow: true,
    pointer: true,
    disabledNested: true,
    nativeText: true,
    gradientChanges: true,
    renderedGradientPixelsChange: true,
  };
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const mp = await mobile.newPage();
  await mp.goto(`${origin}/art-by-waambat`);
  await mp.waitForTimeout(700);
  assert.equal(await mp.locator(".archive-montage iframe").count(), 0);
  assert.ok(
    await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await mp.screenshot({ path: "evidence/archive-inline-mobile-reduced.png" });
  evidence.mobile = {
    width: await mp.evaluate(() => innerWidth),
    noAutomaticFramesWithReducedMotion: true,
    noOverflow: true,
  };
  const mobilePlayback = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await mobilePlayback.route("https://www.youtube.com/iframe_api", (route) =>
    route.fulfill({
      body: youtubeFixture,
      contentType: "application/javascript",
    }),
  );
  await mobilePlayback.route(
    /https:\/\/(player\.vimeo\.com\/video\/|www\.youtube-nocookie\.com\/embed\/)/,
    (route) => route.fulfill({ body: providerHTML, contentType: "text/html" }),
  );
  await mobilePlayback.route("https://fixture.invalid/movie.mp4", (route) =>
    route.fulfill({ body: bytes, contentType: "video/mp4" }),
  );
  const activeMobile = await mobilePlayback.newPage();
  await activeMobile.goto(`${origin}/art-by-waambat`);
  const mobileFirst = activeMobile.locator(".archive-tile").first();
  await mobileFirst.locator('[data-playback-state="playing"]').waitFor();
  const mobileMovie = mobileFirst.frameLocator("iframe").locator("video");
  const mobileStart = await mobileMovie.evaluate(
    (el) => (el as HTMLVideoElement).currentTime,
  );
  await activeMobile.waitForTimeout(500);
  assert.ok(
    (await mobileMovie.evaluate((el) => (el as HTMLVideoElement).currentTime)) >
      mobileStart + 0.2,
  );
  assert.ok(
    await activeMobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await activeMobile.screenshot({
    path: "evidence/archive-inline-mobile-fixture.png",
  });
  evidence.mobilePlayback = {
    width: 390,
    inlineTimeAdvanced: true,
    noOverflow: true,
  };
  const unavailable = await browser.newContext({
    viewport: { width: 1512, height: 733 },
  });
  await unavailable.route("https://player.vimeo.com/video/*", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<script>addEventListener('message',e=>{const d=e.data;if(d?.method==='play')parent.postMessage({event:'error',data:{method:'play',name:'PrivacyError',message:'Video unavailable'}},'*');else if(d?.method)parent.postMessage({method:d.method,value:true},'*');});parent.postMessage({event:'ready'},'*');</script>`,
    }),
  );
  const unavailablePage = await unavailable.newPage();
  unavailablePage.on("pageerror", (e) => errors.push(e.message));
  await unavailablePage.goto(`${origin}/art-by-waambat`);
  const unavailableFirst = unavailablePage.locator(".archive-tile").first();
  await unavailableFirst
    .locator('[data-playback-state="unavailable"]')
    .waitFor();
  assert.ok(
    (
      await unavailableFirst
        .getByRole("link", { name: "Open original source ↗" })
        .getAttribute("href")
    )?.includes("538169390"),
  );
  assert.equal(await unavailableFirst.locator("iframe").count(), 0);
  await unavailablePage.goto(`${origin}/mechanics`);
  evidence.providerFailure =
    "SDK privacy error retains poster and original destination; unmount produces no page error";
  assert.deepEqual(errors, []);
  await mkdir("evidence", { recursive: true });
  await writeFile(
    "evidence/inline-playback-check.json",
    JSON.stringify(evidence, null, 2),
  );
  console.log(JSON.stringify(evidence, null, 2));
} catch (error) {
  console.error(logs.slice(-6000));
  throw error;
} finally {
  await browser?.close();
  child.kill("SIGTERM");
  await rm(folder, { recursive: true, force: true });
}
