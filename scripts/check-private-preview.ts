import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
const manifest = JSON.parse(
  await readFile(".next/required-server-files.json", "utf8"),
) as { config: { env: Record<string, string> } };
assert.equal(
  manifest.config.env.WAAMBAT_REVIEW_BUILD,
  "1",
  "Build a private preview first (Netlify deploy-preview context)",
);
const origin = "http://localhost:3031";
const child = spawn(
  "node",
  ["node_modules/next/dist/bin/next", "start", "--port", "3031"],
  {
    env: {
      ...process.env,
      AUTH_SECRET: "",
      AUTH_GITHUB_ID: "",
      AUTH_GITHUB_SECRET: "",
      ADMIN_GITHUB_IDS: "",
      WAAMBAT_PRIVATE_SITE: "0",
    },
    stdio: "ignore",
  },
);
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`${origin}/admin`);
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  assert.ok(ready, "Production server started");
  for (const path of [
    "/",
    "/ordinals",
    "/mechanics",
    "/art-by-waambat",
    "/blog-press",
    "/bio-waambat",
    "/contact-waambat",
    "/admin/preview",
  ]) {
    const response = await fetch(`${origin}${path}`, { redirect: "manual" });
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), "/admin");
  }
  assert.equal((await fetch(`${origin}/api/admin/content`)).status, 503);
  assert.equal(
    (await fetch(`${origin}/api/admin/upload`, { method: "POST" })).status,
    503,
  );
  assert.equal(
    (await fetch(`${origin}/api/media/${"a".repeat(64)}`)).status,
    404,
  );
  const result = {
    compiledPreviewGate: "Enabled even with runtime WAAMBAT_PRIVATE_SITE=0",
    anonymousGalleries: "307 to /admin",
    unconfiguredAdmin: "503, fail closed",
    anonymousMedia: "404",
    deployment:
      "Local compiled production server; no external deployment or credentials",
  };
  await writeFile(
    "evidence/preview-privacy.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  child.kill("SIGTERM");
}
