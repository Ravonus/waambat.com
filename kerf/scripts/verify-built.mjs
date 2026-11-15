// SSR builds have no prerendered pages for Kerf's static audit to discover.
// Start one owned server, require real phone/desktop results, and always stop it.
import fs from "node:fs/promises";
import path from "node:path";
import { createServer } from "node:net";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { once } from "node:events";
const exec = promisify(execFile),
  root = process.cwd();
const entry = path.join(root, ".output/server/index.mjs");
await fs.access(entry);
const probe = createServer();
probe.listen(0, "127.0.0.1");
await once(probe, "listening");
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const base = `http://127.0.0.1:${port}`,
  server = spawn(process.execPath, [entry], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      NITRO_PORT: String(port),
      HOST: "127.0.0.1",
      NITRO_HOST: "127.0.0.1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
let startupError,
  log = "";
server.on("error", (error) => {
  startupError = error;
});
for (const stream of [server.stdout, server.stderr])
  stream.on("data", (chunk) => {
    log = (log + String(chunk)).slice(-4000);
  });
const routes = [
  "/",
  "/ordinals",
  "/art-by-waambat",
  "/mechanics",
  "/instagram",
  "/contact-waambat",
  "/bio-waambat",
  "/blog-press",
];
try {
  const deadline = Date.now() + 15000;
  let ready = false;
  while (Date.now() < deadline) {
    if (startupError || server.exitCode !== null)
      throw startupError ?? new Error("Built server stopped: " + log);
    try {
      const r = await fetch(base, { signal: AbortSignal.timeout(1000) });
      await r.body?.cancel();
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error("Built server did not become ready: " + log);
  const indexing = process.env.WAAMBAT_PRIVATE_SITE === "1" ? "private" : "public";
  let output;
  try {
    output = (
      await exec(
        process.execPath,
        [
          "node_modules/.bin/kerf",
          "audit",
          ...routes,
          "--url",
          base,
          "--indexing",
          indexing,
          "--json",
        ],
        { cwd: root, env: process.env, timeout: 180000, maxBuffer: 8 * 1024 * 1024 },
      )
    ).stdout;
  } catch (error) {
    if (typeof error.stdout !== "string" || !error.stdout.trim()) throw error;
    output = error.stdout;
  }
  const result = JSON.parse(output);
  if (result.skipped || result.pages?.length !== routes.length)
    throw new Error("Audit did not cover every SSR route");
  const destination = path.join(root, ".kerf/audit/public-routes.json");
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, JSON.stringify(result, null, 2) + "\n");
  console.log(
    JSON.stringify({
      ok: result.ok,
      routes: result.pages.length,
      forms: ["phone", "desktop"],
      errors: result.diagnostics.filter((d) => d.severity === "error").length,
      warnings: result.diagnostics.filter((d) => d.severity === "warning").length,
      report: destination,
    }),
  );
  if (!result.ok) process.exitCode = 1;
} finally {
  if (server.exitCode === null) {
    const closed = once(server, "exit");
    server.kill("SIGTERM");
    const force = setTimeout(() => server.kill("SIGKILL"), 2000);
    await closed;
    clearTimeout(force);
  }
}
