import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { chromium } from "playwright";
import {
  initializeAdminDatabase,
  provisionBackupAdmin,
  verifyBackupCredentials,
  adminDatabase,
  closeAdminDatabase,
} from "../src/server/admin-database";
const directory = await mkdtemp(join(tmpdir(), "waambat-real-auth-"));
const container = `waambat-auth-test-${randomBytes(6).toString("hex")}`;
const dbPassword = randomBytes(48).toString("hex");
const loginPassword = randomBytes(48).toString("base64url");
const origin = "http://localhost:3004";
let server: ReturnType<typeof spawn> | undefined;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let started = false;
let serverLog = "";
try {
  await writeFile(
    join(directory, "database.env"),
    `POSTGRES_PASSWORD=${dbPassword}\nPOSTGRES_DB=waambat_auth_test\n`,
    { mode: 0o600 },
  );
  await writeFile(join(directory, "admin-password.txt"), loginPassword, {
    mode: 0o600,
  });
  execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "-d",
      "--name",
      container,
      "-p",
      "127.0.0.1::5432",
      "--env-file",
      join(directory, "database.env"),
      "postgres:17-alpine",
    ],
    { stdio: "pipe" },
  );
  started = true;
  const address = execFileSync("docker", ["port", container, "5432/tcp"], {
    encoding: "utf8",
  }).trim();
  assert.match(address, /^127\.0\.0\.1:\d+$/);
  process.env.AUTH_DATABASE_URL = `postgres://postgres:${dbPassword}@${address}/waambat_auth_test`;
  process.env.ADMIN_PASSWORD_LOGIN = "1";
  process.env.ADMIN_DATABASE_PROVIDER = "external";
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      execFileSync(
        "docker",
        ["exec", container, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"],
        { stdio: "pipe" },
      );
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  assert.ok(ready);
  await initializeAdminDatabase();
  await initializeAdminDatabase();
  const id = await provisionBackupAdmin("admin", loginPassword);
  await assert.rejects(() =>
    provisionBackupAdmin("admin", randomBytes(30).toString("hex")),
  );
  const records =
    await adminDatabase()`SELECT username,password_hash FROM waambat_admin_accounts`;
  assert.equal(records.length, 1);
  assert.equal(records[0]?.username, "admin");
  assert.ok(!String(records[0]?.password_hash).includes(loginPassword));
  assert.equal(
    await verifyBackupCredentials({
      username: "unknown",
      password: loginPassword,
    }),
    null,
  );
  for (let i = 0; i < 5; i++)
    assert.equal(
      await verifyBackupCredentials({
        username: "admin",
        password: "wrong-password",
      }),
      null,
    );
  assert.equal(
    await verifyBackupCredentials({
      username: "admin",
      password: loginPassword,
    }),
    null,
  );
  await adminDatabase()`UPDATE waambat_admin_accounts SET failures=0,locked_until=NULL WHERE id=${id}`;
  assert.equal(
    (
      await verifyBackupCredentials({
        username: "admin",
        password: loginPassword,
      })
    )?.name,
    "admin",
  );
  const backup = execFileSync(
    "docker",
    [
      "exec",
      container,
      "pg_dump",
      "-U",
      "postgres",
      "--no-owner",
      "--no-acl",
      "waambat_auth_test",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  await writeFile(join(directory, "auth-backup.sql"), backup, { mode: 0o600 });
  execFileSync(
    "docker",
    ["exec", container, "createdb", "-U", "postgres", "waambat_restore_test"],
    { stdio: "pipe" },
  );
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      container,
      "psql",
      "-U",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-d",
      "waambat_restore_test",
    ],
    { input: backup, stdio: ["pipe", "pipe", "pipe"] },
  );
  const restored = execFileSync(
    "docker",
    [
      "exec",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      "waambat_restore_test",
      "-Atc",
      "SELECT username || ':' || auth_version FROM waambat_admin_accounts",
    ],
    { encoding: "utf8" },
  ).trim();
  assert.equal(restored, "admin:1");
  const repository = join(directory, "repository");
  await mkdir(join(repository, "src/content"), { recursive: true });
  await writeFile(
    join(repository, "src/content/site.json"),
    await readFile("src/content/site.json"),
  );
  execFileSync("git", ["init", "-b", "main", repository], { stdio: "pipe" });
  execFileSync("git", ["-C", repository, "add", "src/content/site.json"]);
  execFileSync(
    "git",
    [
      "-C",
      repository,
      "-c",
      "user.name=Isolated auth test",
      "-c",
      "user.email=test@example.invalid",
      "commit",
      "-m",
      "Isolated seeded content",
    ],
    { stdio: "pipe" },
  );
  server = spawn(
    "node",
    ["node_modules/next/dist/bin/next", "dev", "--port", "3004"],
    {
      env: {
        ...process.env,
        AUTH_SECRET: randomBytes(48).toString("hex"),
        AUTH_URL: origin,
        AUTH_GITHUB_ID: "",
        AUTH_GITHUB_SECRET: "",
        ADMIN_GITHUB_IDS: "",
        AUTH_GOOGLE_ID: "",
        AUTH_GOOGLE_SECRET: "",
        ADMIN_EMAILS: "waambat@gmail.com",
        CMS_LOCAL_TEST: "1",
        CMS_LOCAL_REPOSITORY: repository,
        CMS_LOCAL_MEDIA: join(directory, "media"),
        WAAMBAT_PRIVATE_SITE: "0",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout?.on("data", (data) => {
    serverLog += String(data);
  });
  server.stderr?.on("data", (data) => {
    serverLog += String(data);
  });
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  assert.equal((await context.request.get(`${origin}/`)).status(), 200);
  assert.equal(
    (await context.request.get(`${origin}/api/admin/content`)).status(),
    401,
  );
  assert.equal(
    (await context.request.post(`${origin}/api/admin/email-preview`)).status(),
    401,
  );
  const page = await context.newPage();
  page.on("pageerror", (error) => {
    serverLog += `\nBrowser error: ${error.message}\n`;
  });
  await page.goto(`${origin}/admin`);
  await page.getByLabel("Username", { exact: true }).fill("admin");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in with password" }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Unable to sign in" })
    .waitFor();
  await page.getByLabel("Password", { exact: true }).fill(loginPassword);
  await page.getByRole("button", { name: "Sign in with password" }).click();
  await page
    .getByRole("heading", { name: "Manage artwork & content" })
    .waitFor();
  const stateResponse = await context.request.get(
    `${origin}/api/admin/content`,
  );
  assert.equal(stateResponse.status(), 200);
  const state = await stateResponse.json();
  const instagram = state.draft.sections.find(
    (s: { page: string }) => s.page === "instagram",
  );
  instagram.items.push({
    id: "instagram-highlight-test",
    kind: "instagram",
    title: "",
    description: "Owner supplied highlight",
    year: "",
    tokenLink: "https://www.instagram.com/stories/highlights/123456789/",
    poster: "",
    videoSrc: "",
    mobileVideoSrc: "",
    featured: true,
    archived: false,
  });
  const saved = await context.request.post(`${origin}/api/admin/content`, {
    headers: { origin },
    data: { action: "save", revision: state.revision, content: state.draft },
  });
  assert.equal(saved.status(), 200);
  assert.equal(
    (
      await (await context.request.get(`${origin}/api/admin/content`)).json()
    ).draft.sections.find((s: { page: string }) => s.page === "instagram").items
      .length,
    7,
  );
  let externalRequests = 0;
  await page.route("https://www.instagram.com/**", async (route) => {
    externalRequests++;
    await route.fulfill({
      contentType: "text/html",
      body: "<html><body>This Instagram post is unavailable</body></html>",
    });
  });
  await page.goto(`${origin}/admin/preview?page=instagram`);
  assert.equal(await page.locator("[data-instagram]").count(), 7);
  assert.equal(await page.locator("iframe").count(), 0);
  assert.equal(externalRequests, 0);
  await page
    .getByText("Highlights open on Instagram.", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Load Instagram post" })
    .first()
    .click();
  await page.locator("iframe").first().waitFor();
  await page
    .frameLocator("iframe")
    .getByText("This Instagram post is unavailable")
    .waitFor();
  await page.waitForFunction(() =>
    Boolean(document.querySelector("iframe")?.contentWindow),
  );
  assert.equal(
    await page.getByRole("link", { name: "View on Instagram" }).count(),
    7,
  );
  const closePreview = page.getByRole("button", {
    name: "Close Instagram preview",
  });
  await closePreview.scrollIntoViewIfNeeded();
  await closePreview.click();
  await page.locator("iframe").waitFor({ state: "detached" });
  assert.equal(await page.locator("iframe").count(), 0);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "evidence/instagram-draft-mobile.png",
    fullPage: true,
  });
  const mail = await context.request.post(`${origin}/api/admin/email-preview`, {
    headers: { origin },
  });
  assert.equal(mail.status(), 200);
  const capture = await mail.json();
  assert.equal(capture.delivered, false);
  assert.match(capture.mime, /capture@example.invalid/);
  assert.equal(
    (
      await context.request.post(`${origin}/api/admin/email-preview`, {
        headers: { origin: "https://attacker.test" },
      })
    ).status(),
    403,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${origin}/admin`);
  await page.getByLabel("New page title", { exact: true }).fill("Mixed study");
  await page.getByLabel("New page slug", { exact: true }).fill("mixed-study");
  await page
    .getByLabel("Page template", { exact: true })
    .selectOption("gallery");
  await page
    .getByRole("button", { name: "Create draft page", exact: true })
    .click();
  const mixedEditor = page.locator('[data-page="mixed-study"]');
  await mixedEditor.locator("summary").first().click();
  await mixedEditor
    .getByRole("button", { name: "+ Add page block", exact: true })
    .click();
  let lastBlock = mixedEditor.locator("details").last();
  await lastBlock.locator("summary").click();
  await lastBlock
    .getByLabel("Page block text / image description", { exact: true })
    .fill("Mixed media draft text");
  await mixedEditor
    .getByRole("button", { name: "+ Add page block", exact: true })
    .click();
  lastBlock = mixedEditor.locator("details").last();
  await lastBlock.locator("summary").click();
  await lastBlock
    .getByLabel("Block type", { exact: true })
    .selectOption("embed");
  await lastBlock
    .getByLabel("Page block text / image description", { exact: true })
    .fill("Original YouTube source");
  await lastBlock
    .getByLabel("Video source (YouTube, Vimeo, Imgur, Instagram or MP4/WebM)", {
      exact: true,
    })
    .fill("https://youtu.be/T5i24dLZ9Ds");
  await mixedEditor
    .getByRole("button", { name: "+ Add page block", exact: true })
    .click();
  lastBlock = mixedEditor.locator("details").last();
  await lastBlock.locator("summary").click();
  await lastBlock
    .getByLabel("Block type", { exact: true })
    .selectOption("image");
  await lastBlock
    .getByLabel("Page image URL", { exact: true })
    .fill("/posters/1-960.webp");
  await lastBlock
    .getByLabel("Page block text / image description", { exact: true })
    .fill("Original painting poster");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Draft saved. Preview it before publishing." })
    .waitFor();
  assert.equal(
    (await context.request.get(`${origin}/mixed-study`)).status(),
    404,
  );
  let mixedState = await (
    await context.request.get(`${origin}/api/admin/content`)
  ).json();
  assert.ok(
    mixedState.draft.pages.some(
      (p: { slug: string }) => p.slug === "mixed-study",
    ),
  );
  const deletion = structuredClone(mixedState.draft);
  deletion.pages = deletion.pages.filter(
    (p: { slug: string }) => p.slug !== "mixed-study",
  );
  deletion.sections = deletion.sections.filter(
    (s: { page: string }) => s.page !== "mixed-study",
  );
  deletion.navigation = deletion.navigation.filter(
    (n: { href: string }) => n.href !== "/mixed-study",
  );
  assert.equal(
    (
      await context.request.post(`${origin}/api/admin/content`, {
        headers: { origin },
        data: {
          action: "save",
          revision: mixedState.revision,
          content: deletion,
        },
      })
    ).status(),
    400,
  );
  await page.goto(`${origin}/admin/preview?page=mixed-study`);
  await page.getByText("Mixed media draft text", { exact: true }).waitFor();
  assert.equal(await page.locator("iframe").count(), 0);
  assert.equal(
    await page.getByRole("link", { name: "Mixed study", exact: true }).count(),
    1,
  );
  await page.goto(`${origin}/admin`);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Publish saved draft", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Published content committed." })
    .waitFor();
  assert.equal(
    (await context.request.get(`${origin}/mixed-study`)).status(),
    200,
  );
  await page.goto(`${origin}/mixed-study`);
  await page.getByText("Mixed media draft text", { exact: true }).waitFor();
  await page.route("https://www.youtube-nocookie.com/**", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: "<html><body>Controlled provider player fixture</body></html>",
    }),
  );
  await page
    .getByRole("button", { name: "Play Original YouTube source", exact: true })
    .click();
  await page
    .frameLocator("iframe")
    .getByText("Controlled provider player fixture")
    .waitFor();
  await page.getByRole("button", { name: "Close player", exact: true }).click();
  assert.equal(await page.locator("iframe").count(), 0);
  await page.goto(`${origin}/admin`);
  await page.locator('[data-page="mixed-study"] > summary').click();
  await page
    .locator('[data-page="mixed-study"]')
    .getByLabel("Archive page", { exact: true })
    .check();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Draft saved. Preview it before publishing." })
    .waitFor();
  assert.equal(
    (await context.request.get(`${origin}/mixed-study`)).status(),
    200,
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Publish saved draft", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Published content committed." })
    .waitFor();
  assert.equal(
    (await context.request.get(`${origin}/mixed-study`)).status(),
    404,
  );
  await page.goto(`${origin}/mechanics`);
  assert.equal(
    await page.getByRole("link", { name: "Mixed study", exact: true }).count(),
    0,
  );
  mixedState = await (
    await context.request.get(`${origin}/api/admin/content`)
  ).json();
  assert.equal(
    mixedState.draft.pages.find(
      (p: { slug: string }) => p.slug === "mixed-study",
    ).archived,
    true,
  );
  assert.equal(
    mixedState.draft.pages.find(
      (p: { slug: string }) => p.slug === "mixed-study",
    ).blocks.length,
    4,
  );
  await page.goto(`${origin}/admin`);
  await page.locator('[data-page="mixed-study"] > summary').click();
  await page
    .locator('[data-page="mixed-study"]')
    .getByLabel("Archive page", { exact: true })
    .uncheck();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Draft saved. Preview it before publishing." })
    .waitFor();
  await page.goto(`${origin}/admin/preview?page=mixed-study`);
  await page.getByText("Mixed media draft text", { exact: true }).waitFor();
  await page.screenshot({
    path: "evidence/mixed-page-draft-desktop.png",
    fullPage: true,
  });
  await adminDatabase()`UPDATE waambat_admin_accounts SET auth_version=auth_version+1 WHERE id=${id}`;
  assert.equal(
    (await context.request.get(`${origin}/api/admin/content`)).status(),
    401,
  );
  await page.goto(`${origin}/admin`);
  await page.getByLabel("Username", { exact: true }).fill("admin");
  await page.getByLabel("Password", { exact: true }).fill(loginPassword);
  await page.getByRole("button", { name: "Sign in with password" }).click();
  await page
    .getByRole("heading", { name: "Manage artwork & content" })
    .waitFor();
  await adminDatabase()`UPDATE waambat_admin_accounts SET disabled=true WHERE id=${id}`;
  assert.equal(
    (await context.request.get(`${origin}/api/admin/content`)).status(),
    401,
  );
  const evidence = {
    database:
      "Real isolated PostgreSQL 17 container, bound only to loopback; removed after test",
    account:
      "Username admin, random password stored in private temporary file and salted scrypt hash; no default credential or authentication bypass",
    authentication:
      "Real credentials form, Auth.js session, wrong-password rejection, database rate lock, duplicate-account rejection, session-version revocation and disabled-account denial passed",
    content:
      "Git draft read/write authorized through real login; isolated Git repository only",
    instagram:
      "Six original post destinations; optional title/cover, featured highlight, private draft persistence, consent before iframe, unavailable-post fallback link, mobile layout and close passed",
    email:
      "Authorized MIME sandbox capture, unauthorized/CSRF rejection; no outgoing email sent",
    composition:
      "UI-created mixed gallery page with text, image and YouTube URL; Git save/private preview/publish, public isolation, immutable slug/deletion rejection, page archive hides route/navigation, restore retains blocks passed. Fixture player rendering verified; remote playback not claimed.",
    backup:
      "Additive SQL migration applied twice; pg_dump restored into a second isolated test database and account/version verified",
    production: "No cloud database, permanent credential, grant or DNS changes",
  };
  await writeFile(
    "evidence/backup-auth-results.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(JSON.stringify(evidence, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Test failed");
  console.error(
    serverLog
      .replaceAll(dbPassword, "[redacted]")
      .replaceAll(loginPassword, "[redacted]")
      .split("\n")
      .filter((line) => !line.startsWith("    at "))
      .slice(-65)
      .join("\n"),
  );
  // Never emit database/password environment or request payloads.
  await writeFile(join(directory, "server.log"), serverLog, { mode: 0o600 });
  throw error;
} finally {
  await browser?.close();
  server?.kill("SIGTERM");
  await closeAdminDatabase();
  if (started)
    execFileSync("docker", ["rm", "-f", container], { stdio: "pipe" });
  await rm(directory, { recursive: true, force: true });
}
