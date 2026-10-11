import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { setEnvironmentContext } from "@netlify/blobs";
import { readBlobContent, updateBlobContent } from "../src/server/blob-content";
import { seedContent } from "../src/content/seed";
// Controlled HTTP contract fixture: SDK 11's packaged local BlobsServer omits
// GET ETags and does not serialize concurrent conditional writes. This fixture
// exercises documented ETag semantics; remote Netlify acceptance remains separate.
function fixture(file: string, token: string) {
  const records: Record<string, { etag: string; body: string }> = existsSync(
    file,
  )
    ? JSON.parse(readFileSync(file, "utf8"))
    : {};
  return createServer(async (req, res) => {
    if (req.headers.authorization !== `Bearer ${token}`) {
      res.writeHead(403).end();
      return;
    }
    const key = new URL(req.url!, "http://localhost").pathname;
    if (req.method === "GET") {
      const record = records[key];
      if (!record) res.writeHead(404).end();
      else
        res
          .writeHead(200, {
            etag: record.etag,
            "content-type": "application/json",
          })
          .end(record.body);
      return;
    }
    const buffers: Buffer[] = [];
    for await (const chunk of req) buffers.push(Buffer.from(chunk));
    const record = records[key];
    if (
      (req.headers["if-none-match"] === "*" && record) ||
      (req.headers["if-match"] && req.headers["if-match"] !== record?.etag)
    ) {
      res.writeHead(412).end();
      return;
    }
    const etag = `"${randomBytes(16).toString("hex")}"`;
    records[key] = { etag, body: Buffer.concat(buffers).toString("utf8") };
    writeFileSync(file, JSON.stringify(records));
    res.writeHead(200, { etag }).end();
  });
}
test("Netlify SDK contract: persistent reload, private drafts, publish and competing-write rejection", async () => {
  const directory = await mkdtemp(join(tmpdir(), "waambat-blobs-"));
  const token = randomBytes(30).toString("hex");
  const file = join(directory, "store.json");
  let server = fixture(file, token);
  const start = async () => {
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const url = `http://127.0.0.1:${address.port}`;
    setEnvironmentContext({
      siteID: "waambat-isolated-test",
      token,
      edgeURL: url,
      uncachedEdgeURL: url,
    });
  };
  const stop = async () =>
    new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
  try {
    await start();
    process.env.CMS_CONTENT_STORE = "waambat-content-isolated-test";
    const initial = await readBlobContent(seedContent);
    const change = structuredClone(initial.draft);
    change.theme.heading = "#123456";
    change.sections[0]!.items[0]!.title = "Persisted SDK draft";
    const saved = await updateBlobContent(
      seedContent,
      initial.revision,
      "save",
      change,
      "isolated-admin",
    );
    assert.deepEqual(await readBlobContent(seedContent), saved);
    assert.notEqual(
      saved.published.sections[0]!.items[0]!.title,
      "Persisted SDK draft",
    );
    const competing = await Promise.allSettled([
      updateBlobContent(
        seedContent,
        saved.revision,
        "save",
        change,
        "editor-a",
      ),
      updateBlobContent(
        seedContent,
        saved.revision,
        "save",
        change,
        "editor-b",
      ),
    ]);
    assert.equal(competing.filter((r) => r.status === "fulfilled").length, 1);
    const latest = await readBlobContent(seedContent);
    await updateBlobContent(
      seedContent,
      latest.revision,
      "publish",
      undefined,
      "isolated-admin",
      latest.publishedRevision,
    );
    await stop();
    server = fixture(file, token);
    await start();
    assert.equal(
      (await readBlobContent(seedContent)).published.sections[0]!.items[0]!
        .title,
      "Persisted SDK draft",
    );
  } finally {
    await stop();
    delete process.env.CMS_CONTENT_STORE;
    setEnvironmentContext({});
    await rm(directory, { recursive: true, force: true });
  }
});
