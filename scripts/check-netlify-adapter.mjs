// Run after pnpm build. Real installed adapter/application/SDK; loopback only.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const origin = "http://localhost:3040";
const missingMedia = "a".repeat(64);
if (process.env.WAAMBAT_ADAPTER_FIXTURE_CHILD === "1") {
  const transport = globalThis.fetch;
  globalThis.fetch = (input, options) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    if (!["127.0.0.1", "localhost"].includes(url.hostname))
      throw new Error("External access forbidden by isolated fixture");
    return transport(input, options);
  };
  const { encode } = await import("next-auth/jwt");
  const cookie =
    "authjs.session-token=" +
    (await encode({
      secret: process.env.AUTH_SECRET,
      salt: "authjs.session-token",
      token: {
        sub: "900000001",
        adminId: "900000001",
        name: "Isolated adapter owner",
      },
    }));
  const { default: handler } = await import(
    join(process.cwd(), "___netlify-server-handler.mjs")
  );
  const results = [];
  const mode = async (content, media = 200) => {
    await transport(
      process.env.WAAMBAT_ADAPTER_STORAGE_ORIGIN + "/__fixture/mode",
      {
        method: "POST",
        body: JSON.stringify({ content, media }),
      },
    );
  };
  async function execute(label, path, authorized = false, options = {}) {
    const headers = new Headers(options.headers);
    if (authorized) headers.set("cookie", cookie);
    const start = performance.now();
    const response = await handler(
      new Request(origin + path, { ...options, headers }),
      {
        account: { id: "fixture" },
        site: { id: "fixture" },
        deploy: { id: "fixture" },
        requestId: "fixture",
      },
    );
    const body = await response.text();
    results.push({
      label,
      path,
      status: response.status,
      elapsedMs: Math.round(performance.now() - start),
      publishedSentinel: body.includes("ADAPTER_PUBLISHED_SENTINEL"),
      privateDraftExcluded: !body.includes("ADAPTER_PRIVATE_DRAFT_SENTINEL"),
      savedDraftVisible: body.includes("ADAPTER_SAVED_SENTINEL"),
      storageUnavailable: body.includes("Storage is unavailable"),
      cacheControl: response.headers.get("cache-control"),
    });
    return { response, body };
  }
  const post = (label, body, requestOrigin = origin) =>
    execute(label, "/api/admin/content", true, {
      method: "POST",
      headers: { origin: requestOrigin, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  assert.equal(
    (await execute("anonymous admin", "/admin")).response.status,
    200,
  );
  assert.equal(
    (await execute("anonymous state denied", "/api/admin/content")).response
      .status,
    401,
  );
  assert.equal(
    (await execute("anonymous private preview denied", "/admin/preview"))
      .response.status,
    307,
  );
  assert.equal((await execute("published home", "/")).response.status, 200);
  assert.equal(
    (await execute("published archive", "/art-by-waambat")).response.status,
    200,
  );
  const stateResponse = await execute(
    "authorized state",
    "/api/admin/content",
    true,
  );
  assert.equal(stateResponse.response.status, 200);
  const state = JSON.parse(stateResponse.body);
  const candidate = structuredClone(state.draft);
  candidate.sections[0].items[0].title = "ADAPTER_SAVED_SENTINEL";
  assert.equal(
    (
      await post(
        "wrong origin denied",
        { action: "save", revision: state.revision, content: candidate },
        "http://untrusted.invalid",
      )
    ).response.status,
    403,
  );
  assert.equal(
    (
      await post("stale revision denied", {
        action: "save",
        revision: "f".repeat(40),
        content: candidate,
      })
    ).response.status,
    409,
  );
  const saved = await post("authorized draft save", {
    action: "save",
    revision: state.revision,
    content: candidate,
  });
  assert.equal(saved.response.status, 200);
  const draft = JSON.parse(saved.body);
  assert.notEqual(draft.revision, state.revision);
  assert.equal(
    draft.published.sections[0].items[0].title,
    "ADAPTER_PUBLISHED_SENTINEL",
  );
  const publicBefore = await execute("saved draft remains private", "/");
  assert.equal(publicBefore.body.includes("ADAPTER_SAVED_SENTINEL"), false);
  const preview = await execute(
    "authorized private preview",
    "/admin/preview",
    true,
  );
  assert.equal(preview.response.status, 200);
  assert.ok(preview.body.includes("ADAPTER_SAVED_SENTINEL"));
  const published = await post("authorized publish", {
    action: "publish",
    revision: draft.revision,
    publishedRevision: draft.publishedRevision,
  });
  assert.equal(published.response.status, 200);
  assert.ok(
    (await execute("fresh published read", "/")).body.includes(
      "ADAPTER_SAVED_SENTINEL",
    ),
  );
  assert.equal(
    (
      await execute(
        "anonymous unpublished media denied",
        "/api/media/" + missingMedia,
      )
    ).response.status,
    404,
  );
  assert.equal(
    (
      await execute(
        "authorized missing media",
        "/api/media/" + missingMedia,
        true,
      )
    ).response.status,
    404,
  );
  for (const status of [401, 403]) {
    await mode(200, status);
    assert.equal(
      (
        await execute(
          "media provider " + status,
          "/api/media/" + missingMedia,
          true,
        )
      ).response.status,
      503,
    );
  }
  await mode(404);
  assert.equal(
    (await execute("missing state uses seed", "/bio-waambat")).response.status,
    200,
  );
  assert.equal(
    (await execute("missing state authorized read", "/api/admin/content", true))
      .response.status,
    200,
  );
  for (const status of [401, 403, 503]) {
    await mode(status);
    assert.equal(
      (await execute("public provider " + status, "/bio-waambat")).response
        .status,
      500,
    );
    assert.equal(
      (await execute("admin provider " + status, "/api/admin/content", true))
        .response.status,
      503,
    );
  }
  const unavailable = await execute(
    "authorized admin storage unavailable",
    "/admin",
    true,
  );
  assert.equal(unavailable.response.status, 200);
  assert.ok(unavailable.body.includes("Storage is unavailable"));
  await mode(200);
  assert.ok(
    (
      await execute("public recovery preserves published data", "/")
    ).body.includes("ADAPTER_SAVED_SENTINEL"),
  );
  assert.equal(
    (await execute("authorized recovery", "/api/admin/content", true)).response
      .status,
    200,
  );
  for (const result of results)
    assert.ok(result.elapsedMs < 6500, result.label);
  for (const result of results)
    if (["/", "/art-by-waambat", "/bio-waambat"].includes(result.path))
      assert.ok(result.privateDraftExcluded);
  console.log("FIXTURE_RESULT " + JSON.stringify(results));
  process.exit();
}
const bundle = await mkdtemp(join(tmpdir(), "waambat-adapter-"));
const requests = [];
let storage, child;
try {
  await cp(join(root, ".next"), join(bundle, ".next"), {
    recursive: true,
    filter: (path) => !path.startsWith(join(root, ".next/cache")),
  });
  async function repairLinks(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        const original = join(root, path.slice(bundle.length + 1));
        const target = resolve(dirname(original), await readlink(original));
        await rm(path);
        await symlink(target, path);
      } else if (entry.isDirectory()) await repairLinks(path);
    }
  }
  await repairLinks(join(bundle, ".next"));
  await mkdir(join(bundle, ".netlify"));
  await cp(
    join(root, ".netlify/plugins/node_modules/@netlify/plugin-nextjs/dist"),
    join(bundle, ".netlify/dist"),
    { recursive: true },
  );
  await cp(
    join(
      root,
      ".netlify/functions-internal/___netlify-server-handler/___netlify-server-handler.mjs",
    ),
    join(bundle, "___netlify-server-handler.mjs"),
  );
  await symlink(join(root, "node_modules"), join(bundle, "node_modules"));
  await writeFile(
    join(bundle, "package.json"),
    JSON.stringify({ type: "module" }),
  );
  const manifest = JSON.parse(
    await readFile(join(root, ".next/required-server-files.json"), "utf8"),
  );
  assert.equal(manifest.config.env.WAAMBAT_REVIEW_BUILD, "0");
  await writeFile(
    join(bundle, "run-config.json"),
    JSON.stringify({
      nextConfig: manifest.config,
      enableUseCacheHandler: false,
    }),
  );
  const seed = JSON.parse(
    await readFile(join(root, "src/content/site.json"), "utf8"),
  );
  const published = structuredClone(seed),
    draft = structuredClone(seed);
  published.sections[0].items[0].title = "ADAPTER_PUBLISHED_SENTINEL";
  draft.sections[0].items[0].title = "ADAPTER_PRIVATE_DRAFT_SENTINEL";
  let snapshot = {
    published,
    draft,
    revision: "0".repeat(40),
    publishedRevision: "0".repeat(40),
  };
  let etag = '"initial"',
    contentMode = 200,
    mediaMode = 200;
  storage = createServer(async (request, response) => {
    const path = new URL(request.url, origin).pathname;
    if (path === "/__fixture/mode") {
      let body = "";
      for await (const chunk of request) body += chunk;
      ({ content: contentMode, media: mediaMode } = JSON.parse(body));
      response.writeHead(204).end();
      return;
    }
    const mode = path.includes("waambat-media") ? mediaMode : contentMode;
    requests.push({ method: request.method, path, providerStatus: mode });
    if (mode !== 200) {
      response.writeHead(mode).end();
      return;
    }
    if (request.method === "GET") {
      if (path.endsWith("/state"))
        response
          .writeHead(200, { etag, "content-type": "application/json" })
          .end(JSON.stringify(snapshot));
      else response.writeHead(404).end();
      return;
    }
    let body = "";
    for await (const chunk of request) body += chunk;
    if (path.endsWith("/state")) {
      if (request.headers["if-match"] !== etag) {
        response.writeHead(412).end();
        return;
      }
      snapshot = JSON.parse(body);
      etag = '"' + randomBytes(16).toString("hex") + '"';
    }
    response.writeHead(200, { etag }).end();
  });
  await new Promise((resolve) => storage.listen(0, "127.0.0.1", resolve));
  const storageOrigin = "http://127.0.0.1:" + storage.address().port;
  let output = "";
  child = spawn(process.execPath, [fileURLToPath(import.meta.url)], {
    cwd: bundle,
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "production",
      WAAMBAT_ADAPTER_FIXTURE_CHILD: "1",
      CMS_CONTENT_PROVIDER: "netlify-blobs",
      AUTH_SECRET: randomBytes(48).toString("base64url"),
      AUTH_URL: origin,
      AUTH_GITHUB_ID: "isolated-fixture",
      AUTH_GITHUB_SECRET: "isolated-fixture",
      ADMIN_GITHUB_IDS: "900000001",
      WAAMBAT_PRIVATE_SITE: "0",
      NETLIFY_MEDIA_ENABLED: "1",
      WAAMBAT_ADAPTER_STORAGE_ORIGIN: storageOrigin,
      NETLIFY_BLOBS_CONTEXT: Buffer.from(
        JSON.stringify({
          siteID: "fixture",
          deployID: "fixture",
          token: "synthetic-fixture-only",
          primaryRegion: "us-east-2",
          edgeURL: storageOrigin,
          uncachedEdgeURL: storageOrigin,
        }),
      ).toString("base64"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));
  const timer = setTimeout(() => child.kill("SIGKILL"), 45000);
  const code = await new Promise((resolve) => child.on("exit", resolve));
  clearTimeout(timer);
  const line = output
    .split("\n")
    .find((line) => line.startsWith("FIXTURE_RESULT "));
  assert.equal(code, 0, output.slice(-3000));
  assert.ok(line);
  const results = JSON.parse(line.slice("FIXTURE_RESULT ".length));
  await writeFile(
    join(root, "evidence/netlify-adapter-outage-check.json"),
    JSON.stringify(
      {
        boundary:
          "Installed Netlify Next adapter5.16.2 + fresh compiled application + real SDK11.1.4 + loopback storage contract. Synthetic signed local Auth.js session; password/Postgres tested separately. No hosted requests/credentials.",
        mechanism:
          "Explicit fetch signal avoids Next GET response cloning and pending SDK cancellation; deadline handles independent transport/body stalls.",
        sourceBase:
          "20ddb7c5c64389c201870d65165867b9a57ac0b3 plus local candidate",
        buildId: (await readFile(join(root, ".next/BUILD_ID"), "utf8")).trim(),
        results,
        requests,
        limitations:
          "Loopback ETag/CAS storage is not hosted acceptance. Separate browser/auth tests cover password, upload cancellation/errors and validation. Hosted CRUD still required.",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Netlify adapter: " + results.length + " public/admin/media checks passed",
  );
} finally {
  if (child && child.exitCode === null) child.kill("SIGKILL");
  if (storage) {
    storage.closeAllConnections();
    await new Promise((resolve) => storage.close(resolve));
  }
  await rm(bundle, { recursive: true, force: true });
}
