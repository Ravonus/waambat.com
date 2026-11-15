import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readCardImage} from '../src/server/card-image';

const fixture = async (run: (root: string) => Promise<void>) => {
  const root = await mkdtemp(join(tmpdir(), 'waambat-card-image-'));
  try { await run(root); } finally { await rm(root, {recursive: true, force: true}); }
};

test('serverless card images load from the canonical public CDN with no public directory', () => fixture(async root => {
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(String(url), 'https://waamb.at/brand/logo.svg');
    assert.equal(init?.redirect, 'error');assert.equal(init?.credentials, 'omit');
    return new Response('the published image', {headers: {'content-type': 'image/svg+xml'}});
  };
  assert.equal((await readCardImage('/brand/logo.svg?v=123', {root, fetcher})).toString(), 'the published image');
}));

test('development card images use exact local bytes without fetching', () => fixture(async root => {
  await writeFile(join(root, 'artist.webp'), 'local original');
  const fetcher: typeof fetch = async () => {throw Error('unexpected network');};
  assert.equal((await readCardImage('/artist.webp', {root, fetcher})).toString(), 'local original');
}));

test('card images cannot request other hosts, private endpoints or traversal paths', () => fixture(async root => {
  let requests = 0;
  const fetcher: typeof fetch = async () => {requests++;return new Response();};
  for (const source of ['https://other.test/a.png', '//other.test/a.png', '/api/admin/a.png', '/admin/a.svg', '/_kerf/a.webp', '/%61dmin/a.svg', '/../a.png', '/a/%2e%2e/b.png', '/a\\b.png', '/x.json'])
    await assert.rejects(readCardImage(source, {root, fetcher}));
  assert.equal(requests, 0);
}));

test('missing, non-image and oversized CDN responses cannot enter a card', () => fixture(async root => {
  for (const response of [new Response('missing', {status:404}), new Response('private data', {headers:{'content-type':'application/json'}}), new Response('large', {headers:{'content-type':'image/png','content-length':String(21*1024*1024)}})]) {
    const fetcher: typeof fetch = async () => response;
    await assert.rejects(readCardImage('/artist.png', {root, fetcher}));
  }
}));

test('streamed card images enforce the size limit without trusting content-length', () => fixture(async root => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({pull(controller) {controller.enqueue(new Uint8Array(1024*1024));}, cancel() {cancelled = true;}});
  const fetcher: typeof fetch = async () => new Response(body, {headers:{'content-type':'image/png'}});
  await assert.rejects(readCardImage('/artist.png', {root, fetcher}), /too large/);
  assert.equal(cancelled, true);
}));
