#!/usr/bin/env node
// Downloads the site-video sources named in sources.json into ./src and checks their sha256.
//   node keel/hero/fetch-sources.mjs [--dest keel/hero/src]
// The two Ordinals pieces (LUX, Kismet Twist) are not downloadable files; see capture-ordinals.mjs.
// A hash mismatch is reported, not fatal: Imgur may re-encode, and a different file renders a
// different (but still valid) montage. The committed hero was rendered from the hashes recorded here.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({ options: { dest: { type: 'string', default: path.join(here, 'src') } } });
const { sources } = JSON.parse(readFileSync(path.join(here, 'sources.json'), 'utf8'));
mkdirSync(values.dest, { recursive: true });
let missing = 0;
for (const source of sources) {
  const target = path.join(values.dest, source.file);
  if (source.kind !== 'site-video') {
    if (!existsSync(target)) { console.log(`capture needed: ${source.file} (${source.title})`); missing++; }
    continue;
  }
  let bytes;
  if (existsSync(target)) bytes = readFileSync(target);
  else {
    const response = await fetch(source.origin);
    if (!response.ok) { console.log(`FAILED ${source.file}: HTTP ${response.status} ${source.origin}`); missing++; continue; }
    bytes = Buffer.from(await response.arrayBuffer());
    writeFileSync(target, bytes);
  }
  const digest = createHash('sha256').update(bytes).digest('hex');
  console.log(`${digest === source.sha256 ? 'ok      ' : 'DIFFERS '} ${source.file}`);
}
if (missing) process.exitCode = 1;
