import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { seedContent } from "../src/content/seed";
import { chromium } from "playwright";

// Compiled Next server + real Netlify SDK, with a local HTTP storage contract.
// This deliberately does not claim acceptance against the hosted provider.
let unavailable = false;
let reads = 0;
const observations: { elapsedMs: number; unavailable: boolean }[] = [];
const observedStart = performance.now();
const published = structuredClone(seedContent);
const draft = structuredClone(seedContent);
draft.sections[0]!.items[0]!.title = "PRIVATE_DRAFT_MUST_NOT_RENDER";
const storage = createServer((request, response) => {
  assert.equal(request.method, "GET");
  reads++;
  observations.push({
    elapsedMs: Math.round(performance.now() - observedStart),
    unavailable,
  });
  if (unavailable) {
    response.writeHead(503).end();
    return;
  }
  response
    .writeHead(200, { etag: '"fixture"', "content-type": "application/json" })
    .end(
      JSON.stringify({
        published,
        draft,
        revision: "0".repeat(40),
        publishedRevision: "0".repeat(40),
      }),
    );
});
await new Promise<void>((resolve) => storage.listen(0, "127.0.0.1", resolve));
const address = storage.address();
assert.ok(address && typeof address !== "string");
const storageURL = `http://127.0.0.1:${address.port}`;
const child = spawn(
  "node",
  ["node_modules/next/dist/bin/next", "start", "--port", "3037"],
  {
    env: {
      ...process.env,
      AUTH_SECRET: "",
      WAAMBAT_PRIVATE_SITE: "0",
      CMS_CONTENT_PROVIDER: "netlify-blobs",
      NETLIFY_BLOBS_CONTEXT: Buffer.from(
        JSON.stringify({
          siteID: "waambat-isolated-test",
          token: randomBytes(30).toString("hex"),
          edgeURL: storageURL,
          uncachedEdgeURL: storageURL,
        }),
      ).toString("base64"),
    },
    stdio: ["ignore", "ignore", "pipe"],
  },
);
let errors = "";
child.stderr?.on("data", (chunk: Buffer) => {
  errors += chunk.toString();
});
const origin = "http://localhost:3037";
let stage = "startup";
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      ready = (await fetch(`${origin}/admin`)).ok;
      if (ready) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(ready);
  reads = 0;
  stage = "initial-render";
  const initial = await (await fetch(`${origin}/art-by-waambat`)).text();
  assert.ok(initial.includes("archive-montage"));
  assert.ok(!initial.includes("PRIVATE_DRAFT_MUST_NOT_RENDER"));
  assert.equal(reads, 1, "Metadata/page/layout share one storage read");
  published.sections[0]!.items[0]!.title = "Fresh published snapshot";
  stage = "fresh-render";
  const nextRequest = await (await fetch(origin)).text();
  assert.ok(nextRequest.includes("Fresh published snapshot"));
  assert.ok(!nextRequest.includes("PRIVATE_DRAFT_MUST_NOT_RENDER"));
  assert.equal(reads, 2, "A new request reads fresh published state");
  unavailable = true;
  const readsBeforeOutage = reads;
  const started = performance.now();
  stage = "outage-headers";
  const outage = await fetch(`${origin}/bio-waambat`, {
    signal: AbortSignal.timeout(35000),
  });
  stage = "outage-body";
  const body = await outage.text();
  const elapsed = performance.now() - started;
  const outageReads = reads - readsBeforeOutage;
  assert.ok(elapsed < 7000, `Storage outage completed in ${elapsed}ms`);
  assert.ok(
    body.includes("digest"),
    "RSC response contains an explicit failure",
  );
  assert.ok(!body.includes("bio-columns"), "Outage does not substitute seed");
  assert.ok(errors.includes("WAAMBAT content storage read failed"));
  assert.ok(errors.includes("deadline"));
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route("https://**", (route) => route.abort());
  stage = "outage-browser";
  await page.goto(`${origin}/bio-waambat`, { waitUntil: "domcontentloaded" });
  await page
    .getByRole("heading", { name: "This page could not load" })
    .waitFor({ timeout: 10000 });
  await page.screenshot({ path: "evidence/storage-outage-mobile.png" });
  await writeFile(
    "evidence/storage-outage-check.json",
    JSON.stringify(
      {
        boundary:
          "Compiled Next + real Netlify SDK + local HTTP contract; hosted storage cause remains unverified",
        publicReadCountPerSuccessfulRender: 1,
        publicReadCountDuringErrorRender: outageReads,
        newRequestReadsFreshPublishedState: true,
        privateDraftExcluded: true,
        providerFailureStatus: 503,
        publicResponseStatus: outage.status,
        outageElapsedMs: Math.round(elapsed),
        browserErrorBoundaryVisible: true,
        seedFallbackOnFailure: false,
        credentialsChanged: false,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Compiled storage outage, freshness, draft privacy and read deduplication pass",
  );
} catch (error) {
  console.error({
    stage,
    reads,
    observations,
    error: error instanceof Error ? error.name : "unknown",
    storageLog: errors
      .split("\n")
      .filter((line) =>
        /WAAMBAT content storage read failed|reason:|status:|category:/.test(
          line,
        ),
      ),
  });
  throw error;
} finally {
  await browser?.close();
  child.kill();
  storage.closeAllConnections();
  await new Promise<void>((resolve) => storage.close(() => resolve()));
}
