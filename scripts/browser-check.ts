import { chromium } from "playwright";
import { encode } from "next-auth/jwt";
import { randomBytes } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import assert from "node:assert/strict";
const origin = "http://localhost:3000";
const secret = randomBytes(48).toString("hex");
const fixtureDir = await mkdtemp(join(tmpdir(), "waambat-git-browser-"));
const repository = join(fixtureDir, "repository");
await mkdir(join(repository, "src/content"), { recursive: true });
await writeFile(
  join(repository, "src/content/site.json"),
  await readFile("src/content/site.json"),
);
execFileSync("git", ["init", "-b", "main", repository]);
execFileSync("git", ["-C", repository, "add", "src/content/site.json"]);
execFileSync("git", [
  "-C",
  repository,
  "-c",
  "user.name=Local browser test",
  "-c",
  "user.email=test@example.invalid",
  "commit",
  "-m",
  "Initial isolated content",
]);
const fixture = process.env.TEST_VIDEO ?? join(fixtureDir, "loop.mp4");
if (!process.env.TEST_VIDEO)
  execFileSync("ffmpeg", [
    "-loglevel",
    "error",
    "-loop",
    "1",
    "-i",
    "public/thumbnails/1.png",
    "-t",
    "2",
    "-vf",
    "scale=320:320",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-an",
    fixture,
  ]);
const child = spawn("node", ["node_modules/next/dist/bin/next", "dev"], {
  env: {
    ...process.env,
    AUTH_SECRET: secret,
    CMS_LOCAL_TEST: "1",
    CMS_LOCAL_REPOSITORY: repository,
    CMS_LOCAL_MEDIA: join(fixtureDir, "media"),
    WAAMBAT_PRIVATE_SITE: "0",
    AUTH_GITHUB_ID: "local-test",
    AUTH_GITHUB_SECRET: "local-test",
    ADMIN_GITHUB_IDS: "900000001",
    AUTH_URL: origin,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
child.stdout.on("data", (d) => {
  logs += String(d);
});
child.stderr.on("data", (d) => {
  logs += String(d);
});
const evidence: Record<string, unknown> = {};
let browser;
try {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  await mkdir("evidence", { recursive: true });
  const anon = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const api = anon.request;
  assert.equal((await api.get(`${origin}/api/admin/content`)).status(), 401);
  assert.equal(
    (await api.post(`${origin}/api/admin/content`, { data: {} })).status(),
    401,
  );
  assert.equal(
    (await api.post(`${origin}/api/admin/upload`, { data: "bad" })).status(),
    401,
  );
  const reduced = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const rp = await reduced.newPage();
  await rp.goto(origin);
  await rp.waitForTimeout(500);
  assert.equal(await rp.locator("video[src]").count(), 0);
  await rp.getByRole("button", { name: "Menu", exact: true }).click();
  await rp.getByRole("link", { name: "ORDINALS", exact: true }).click();
  await rp.getByRole("heading", { name: "LUX", exact: true }).waitFor();
  assert.equal(
    await rp
      .locator('a[href="https://www.satflow.com/ordinals/kismettwist"]')
      .count(),
    2,
  );
  await rp.screenshot({ path: "evidence/ordinals-mobile.png", fullPage: true });
  evidence.reducedMotion = "No video source loaded before explicit playback";
  const page = await anon.newPage();
  const videoBytes = await readFile(fixture);
  const requests: string[] = [];
  await page.route("https://i.imgur.com/**", async (route) => {
    requests.push(route.request().url());
    await route.fulfill({ body: videoBytes, contentType: "video/mp4" });
  });
  await page.goto(origin);
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll("video")).some(
      (v) => !v.paused && v.readyState >= 2,
    ),
  );
  assert.ok(
    new Set(requests).size <= 4,
    `Only viewport paintings load initially: ${new Set(requests).size}`,
  );
  const initialCount = requests.length;
  const firstCount = requests.filter((u) => u.includes("bNlZWHY")).length;
  await page.screenshot({ path: "evidence/playback-fixture-desktop.png" });
  await page.locator('[data-artwork="artwork-10"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  assert.ok(
    await page
      .locator('[data-artwork="artwork-1"] video')
      .evaluate((v: HTMLVideoElement) => v.paused),
  );
  await page.locator('[data-artwork="artwork-1"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  assert.equal(
    requests.filter((u) => u.includes("bNlZWHY")).length,
    firstCount,
  );
  evidence.video = {
    initialRequests: initialCount,
    totalRequestsAfterScrolling: requests.length,
    repeatFetchesOnScrollReturn: 0,
    initialSources: new Set(requests.slice(0, initialCount)).size,
    responsiveSource:
      "Mobile preview decoded a real privately uploaded MP4 fixture from the isolated media filesystem",
    playback:
      "Real browser decoding with generated local fixture; original Imgur transport blocked",
  };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin);
  await page.waitForTimeout(300);
  await page.screenshot({ path: "evidence/playback-fixture-mobile.png" });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  const visual = await reduced.newPage();
  await visual.goto(origin);
  await visual
    .getByRole("heading", { name: "Feels 404", exact: true })
    .waitFor();
  await visual.screenshot({ path: "evidence/mobile.png" });
  await visual.setViewportSize({ width: 1440, height: 1000 });
  await visual.goto(origin);
  await visual
    .getByRole("heading", { name: "Feels 404", exact: true })
    .waitFor();
  await visual.screenshot({ path: "evidence/desktop.png" });
  const owner = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const jwt = await encode({
    secret,
    token: { sub: "900000001", adminId: "900000001", name: "Test owner" },
    salt: "authjs.session-token",
    maxAge: 3600,
  });
  await owner.addCookies([
    {
      name: "authjs.session-token",
      value: jwt,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const admin = await owner.newPage();
  await admin.goto(`${origin}/admin`);
  console.log(
    "Admin loaded",
    (await admin.locator("body").innerText()).slice(0, 120),
  );
  await admin
    .getByRole("heading", { name: "Manage artwork & content" })
    .waitFor();
  const initial = await (
    await owner.request.get(`${origin}/api/admin/content`)
  ).json();
  assert.equal(
    (
      await owner.request.post(`${origin}/api/admin/content`, {
        data: { revision: initial.revision, action: "publish" },
        headers: { Origin: "https://attacker.test" },
      })
    ).status(),
    403,
  );
  const forged = structuredClone(initial.draft);
  forged.sections[0].intro = '<img onerror="alert(1)">';
  assert.equal(
    (
      await owner.request.post(`${origin}/api/admin/content`, {
        data: { revision: initial.revision, action: "save", content: forged },
        headers: { Origin: origin },
      })
    ).status(),
    400,
  );
  const file = await readFile("public/posters/1-480.webp");
  const uploaded = await owner.request.post(`${origin}/api/admin/upload`, {
    headers: { Origin: origin },
    multipart: {
      file: { name: "poster.webp", mimeType: "image/webp", buffer: file },
    },
  });
  assert.equal(uploaded.status(), 200);
  const media = await uploaded.json();
  assert.equal((await api.get(`${origin}${media.url}`)).status(), 404);
  const repeated = await owner.request.post(`${origin}/api/admin/upload`, {
    headers: { Origin: origin },
    multipart: {
      file: { name: "poster.webp", mimeType: "image/webp", buffer: file },
    },
  });
  assert.equal((await repeated.json()).url, media.url);
  const range = await owner.request.get(`${origin}${media.url}`, {
    headers: { Range: "bytes=0-3" },
  });
  assert.equal(range.status(), 206);
  assert.equal((await range.body()).length, 4);
  const badUpload = await owner.request.post(`${origin}/api/admin/upload`, {
    headers: { Origin: origin },
    multipart: {
      file: {
        name: "evil.webp",
        mimeType: "image/webp",
        buffer: Buffer.from("<html>not image</html>"),
      },
    },
  });
  assert.equal(badUpload.status(), 415);
  await admin.getByText("Feels 404", { exact: true }).click();
  const originalDetail = admin
    .locator("section")
    .first()
    .locator("details")
    .first();
  const uploadInput = originalDetail.locator('input[type="file"]').first();
  await uploadInput.setInputFiles({
    name: "bad.webp",
    mimeType: "image/webp",
    buffer: Buffer.from("<html>not image</html>"),
  });
  await admin
    .getByRole("status")
    .filter({ hasText: "File content does not match" })
    .waitFor();
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await admin.route("**/api/admin/upload", async (route) => {
    await held;
    await route.abort().catch(() => {});
  });
  const posterBefore = await originalDetail
    .getByLabel("Poster / image URL", { exact: true })
    .inputValue();
  await uploadInput.setInputFiles({
    name: "poster.webp",
    mimeType: "image/webp",
    buffer: file,
  });
  await admin
    .getByRole("button", { name: "Cancel upload", exact: true })
    .click();
  release();
  await admin
    .getByRole("status")
    .filter({ hasText: "Upload cancelled" })
    .waitFor();
  assert.equal(
    await originalDetail
      .getByLabel("Poster / image URL", { exact: true })
      .inputValue(),
    posterBefore,
  );
  await admin.unroute("**/api/admin/upload");
  await admin
    .getByLabel("Artwork title", { exact: true })
    .first()
    .fill("Draft test title");
  await admin.getByRole("button", { name: "Save draft", exact: true }).click();
  await admin.getByRole("status").filter({ hasText: "Draft saved." }).waitFor();
  const saved = await (
    await owner.request.get(`${origin}/api/admin/content`)
  ).json();
  assert.equal(saved.draft.sections[0].items[0].title, "Draft test title");
  assert.equal(
    saved.published.sections[0].items[0].title,
    initial.published.sections[0].items[0].title,
  );
  const preview = await owner.newPage();
  await preview.goto(`${origin}/admin/preview`);
  await preview
    .getByRole("heading", { name: "Draft test title", exact: true })
    .waitFor();
  const videoUpload = await owner.request.post(`${origin}/api/admin/upload`, {
    headers: { Origin: origin },
    multipart: {
      file: { name: "loop.mp4", mimeType: "video/mp4", buffer: videoBytes },
    },
  });
  assert.equal(videoUpload.status(), 200);
  const mobileMedia = await videoUpload.json();
  const withMobile = structuredClone(saved.draft);
  withMobile.sections[0].items[0].mobileVideoSrc = mobileMedia.url;
  const mobileSave = await owner.request.post(`${origin}/api/admin/content`, {
    headers: { Origin: origin },
    data: { revision: saved.revision, action: "save", content: withMobile },
  });
  assert.equal(mobileSave.status(), 200);
  const mobilePreview = await owner.newPage();
  await mobilePreview.setViewportSize({ width: 390, height: 844 });
  await mobilePreview.goto(`${origin}/admin/preview`);
  await mobilePreview.waitForFunction(() => {
    const v = document.querySelector("video");
    return v && !v.paused && v.readyState >= 2;
  });
  assert.equal(
    await mobilePreview.locator("video").first().getAttribute("src"),
    mobileMedia.url,
  );
  // An external save must cause a stale studio write to fail without losing its edits.
  await admin
    .getByLabel("Year", { exact: true })
    .first()
    .fill("2023 · unsaved conflict test");
  await admin.getByRole("button", { name: "Save draft", exact: true }).click();
  await admin
    .getByRole("status")
    .filter({ hasText: "A newer version exists" })
    .waitFor();
  assert.equal(
    await admin.getByLabel("Year", { exact: true }).first().inputValue(),
    "2023 · unsaved conflict test",
  );
  admin.once("dialog", (d) => d.accept());
  await admin
    .getByRole("button", { name: "Reload / discard edits", exact: true })
    .click();
  await admin
    .getByRole("status")
    .filter({ hasText: "Latest draft loaded" })
    .waitFor();
  const currentSaved = await (
    await owner.request.get(`${origin}/api/admin/content`)
  ).json();
  assert.equal(
    (
      await owner.request.post(`${origin}/api/admin/content`, {
        data: {
          revision: initial.revision,
          action: "save",
          content: initial.draft,
        },
        headers: { Origin: origin },
      })
    ).status(),
    409,
  );
  admin.once("dialog", (d) => d.dismiss());
  await admin
    .getByRole("button", { name: "Publish saved draft", exact: true })
    .click();
  assert.equal(
    (await (await owner.request.get(`${origin}/api/admin/content`)).json())
      .revision,
    currentSaved.revision,
  );
  admin.once("dialog", (d) => d.accept());
  await admin
    .getByRole("button", { name: "Publish saved draft", exact: true })
    .click();
  await admin
    .getByRole("status")
    .filter({ hasText: "Published content committed" })
    .waitFor();
  await admin
    .getByRole("button", { name: "+ Add artwork", exact: true })
    .first()
    .click();
  await admin.getByText("New artwork", { exact: true }).click();
  const added = admin.locator("section").first().locator("details").last();
  await added
    .getByLabel("Artwork title", { exact: true })
    .fill("New test artwork");
  await admin.getByRole("button", { name: "Save draft", exact: true }).click();
  await admin.getByRole("status").filter({ hasText: "Draft saved." }).waitFor();
  await added.getByLabel("Archive artwork (reversible)").check();
  await admin.getByRole("button", { name: "Save draft", exact: true }).click();
  await admin.getByRole("status").filter({ hasText: "Draft saved." }).waitFor();
  await admin.screenshot({
    path: "evidence/admin-desktop.png",
    fullPage: true,
  });
  // Restore the isolated Git draft/production branches, retaining commit history.
  const latest = await (
    await owner.request.get(`${origin}/api/admin/content`)
  ).json();
  const restored = await owner.request.post(`${origin}/api/admin/content`, {
    data: { revision: latest.revision, action: "save", content: initial.draft },
    headers: { Origin: origin },
  });
  assert.equal(restored.status(), 200);
  const restoredState = await restored.json();
  assert.equal(
    (
      await owner.request.post(`${origin}/api/admin/content`, {
        data: {
          revision: restoredState.revision,
          publishedRevision: restoredState.publishedRevision,
          action: "publish",
        },
        headers: { Origin: origin },
      })
    ).status(),
    200,
  );
  evidence.boundary =
    "Browser tests use the production content schema and real local Git commits under a development-only adapter. Real GitHub OAuth/App grants, remote Netlify deployments and Netlify Blobs have not been exercised. Netlify adapter packaging is checked separately.";
  evidence.admin =
    "Real signed Auth.js session, isolated Git repository and media filesystem: unauthorized access, CSRF, validation, upload deduplication, private media, byte ranges, upload error, browser draft/save/preview/publish/cancel/add/archive and upload-error/cancellation, stale revision conflict and restore passed";
  await writeFile(
    "evidence/browser-results.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(JSON.stringify(evidence, null, 2));
} catch (e) {
  console.error(logs.slice(-4000));
  throw e;
} finally {
  await browser?.close();
  child.kill("SIGTERM");
  await rm(fixtureDir, { recursive: true, force: true });
}
