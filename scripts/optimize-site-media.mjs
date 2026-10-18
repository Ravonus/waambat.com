// Rebuilds content-addressed display derivatives; never overwrites the original artwork.
// Requires ffmpeg on PATH (or FFMPEG_BIN); Sharp ships with Next.js.
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir, copyFile, rename } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve, join } from "node:path";
const load = createRequire(import.meta.resolve("next/package.json"));
const sharp = load("sharp");
sharp.concurrency(1);
const exec = promisify(execFile);
const ffmpeg = process.env.FFMPEG_BIN || "ffmpeg";
const root = process.cwd();
const cache = resolve(process.argv[2] || ".netlify/media-source-cache");
const output = join(root, "public/paintings");
const content = JSON.parse(await readFile("src/content/site.json", "utf8"));
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
await mkdir(cache, { recursive: true });
await mkdir(output, { recursive: true });
const paintings = content.sections
  .filter(
    (section) => section.page === "nfts" && section.presentation !== "hero",
  )
  .flatMap((section) => section.items)
  .filter(
    (item) =>
      item.kind === "video" &&
      /^https:\/\/i\.imgur\.com\/[A-Za-z0-9]+\.mp4$/.test(item.videoSrc),
  );
const results = new Array(paintings.length);
// Autocorrection's former Imgur address now serves HTML. This is the exact
// artifactUri from HEN token 725958, also used by its current Objkt player.
const recovered = {
  "artwork-4": {
    source:
      "https://assets.objkt.media/file/assets-003/Qmf3UfKRRpBcoKH7DfJsix772m4ovRb6gaxrMPfPeSYoFZ/artifact",
    token: "https://objkt.com/tokens/hicetnunc/725958",
  },
};
let cursor = 0;
async function frames(file) {
  const result = await exec(
    ffmpeg,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-xerror",
      "-i",
      file,
      "-map",
      "0:v:0",
      "-c:v",
      "copy",
      "-an",
      "-progress",
      "pipe:1",
      "-nostats",
      "-f",
      "null",
      "-",
    ],
    { maxBuffer: 1024 * 1024 },
  );
  if (result.stderr.trim()) throw new Error(`Video packet errors: ${file}`);
  const count = Number(
    [...result.stdout.matchAll(/^frame=(\d+)$/gm)].at(-1)?.[1],
  );
  if (!count) throw new Error(`No video frames: ${file}`);
  return count;
}
async function encode(source, width, id, expectedFrames) {
  const file = join(cache, `${id}-${width}-h264-25-v2.mp4`);
  try {
    if ((await frames(file)) !== expectedFrames)
      throw new Error("Incomplete cached display video");
  } catch {
    const temporary = `${file}.part.mp4`;
    await exec(
      ffmpeg,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-xerror",
        "-y",
        "-threads",
        "2",
        "-i",
        source,
        "-map",
        "0:v:0",
        "-an",
        "-vf",
        `scale='min(${width},iw)':-2:flags=lanczos`,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "25",
        "-movflags",
        "+faststart",
        "-threads",
        "2",
        "-pix_fmt",
        "yuv420p",
        temporary,
      ],
      { maxBuffer: 1024 * 1024 },
    );
    if ((await frames(temporary)) !== expectedFrames)
      throw new Error(`Frame count changed: ${id} (${width}px)`);
    await rename(temporary, file);
  }
  const bytes = await readFile(file);
  const name = `${digest(bytes).slice(0, 24)}.mp4`;
  await copyFile(file, join(output, name));
  return { src: `/paintings/${name}`, bytes: bytes.length };
}
async function worker() {
  while (cursor < paintings.length) {
    const index = cursor++;
    const item = paintings[index];
    const recovery = recovered[item.id];
    const sourceURL = recovery?.source || item.videoSrc;
    const source = join(cache, `${item.id}${recovery ? "-recovered" : ""}.mp4`);
    try {
      await frames(source);
    } catch {
      const response = await fetch(sourceURL, {
        signal: AbortSignal.timeout(120000),
      });
      if (!response.ok)
        throw new Error(
          `Original unavailable: ${item.id} (${response.status})`,
        );
      if (Number(response.headers.get("content-length")) > 150 * 1024 * 1024)
        throw new Error(`Original exceeds source budget: ${item.id}`);
      await pipeline(
        Readable.fromWeb(response.body),
        createWriteStream(`${source}.part`),
      );
      await frames(`${source}.part`);
      await rename(`${source}.part`, source);
    }
    const original = await readFile(source);
    const frameCount = await frames(source);
    const available = original.subarray(4, 8).toString() === "ftyp";
    const desktop = available
      ? await encode(source, 960, item.id, frameCount)
      : { src: "", bytes: 0 };
    const mobile = available
      ? await encode(source, 640, item.id, frameCount)
      : { src: "", bytes: 0 };
    const still = await readFile(join(root, "public", item.poster));
    const posterBytes = {};
    const renditions = [];
    for (const width of [384, 640, 960]) {
      const base = sharp(still).resize({ width, withoutEnlargement: true });
      const webp = await base
        .clone()
        .webp({ quality: 80, effort: 5 })
        .toBuffer();
      const avif = await base
        .clone()
        .avif({ quality: 58, effort: 4 })
        .toBuffer();
      renditions.push({ width, webp, avif });
      posterBytes[width] = { webp: webp.length, avif: avif.length };
    }
    const posterId = digest(
      Buffer.concat(renditions.flatMap(({ webp, avif }) => [webp, avif])),
    ).slice(0, 24);
    for (const { width, webp, avif } of renditions) {
      await writeFile(join(output, `${posterId}-${width}.webp`), webp);
      await writeFile(join(output, `${posterId}-${width}.avif`), avif);
    }
    results[index] = {
      id: item.id,
      original: item.videoSrc,
      frames: frameCount,
      source: sourceURL,
      sourceToken: recovery?.token,
      originalBytes: available ? original.length : 0,
      available,
      originalSha256: digest(original),
      desktop: desktop.src,
      mobile: mobile.src,
      desktopBytes: desktop.bytes,
      mobileBytes: mobile.bytes,
      originalPoster: item.poster,
      poster: `/paintings/${posterId}-960.webp`,
      posterBytes,
    };
    console.log(
      JSON.stringify({
        item: item.id,
        original: original.length,
        desktop: desktop.bytes,
        mobile: mobile.bytes,
      }),
    );
  }
}
await worker();
const hero = {};
const banner = content.sections.find(
  (section) => section.presentation === "hero",
)?.items[0];
for (const field of [
  "videoSrc",
  "mobileVideoSrc",
  "loopSrc",
  "mobileLoopSrc",
  "poster",
  "mobilePoster",
]) {
  const source = banner?.[field];
  if (!source?.startsWith("/hero/")) continue;
  const bytes = await readFile(join(root, "public", source));
  const extension = source.split(".").at(-1);
  const name = `${digest(bytes).slice(0, 24)}.${extension}`;
  await writeFile(join(output, name), bytes);
  hero[source] = `/paintings/${name}`;
}
await writeFile(
  "src/content/optimized-media.json",
  JSON.stringify({ version: 1, paintings: results, hero }, null, 2) + "\n",
);
console.log(
  "Prepared all display derivatives. Originals and their external source links are unchanged.",
);
