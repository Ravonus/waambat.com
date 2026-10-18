// Prepare the contact animation locally so third-party 403s cannot break it.
import { readFile, writeFile, mkdir, readdir, cp } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
const exec = promisify(execFile),
  ffmpeg = process.env.FFMPEG_BIN || "ffmpeg";
const sharp = createRequire(import.meta.resolve("next/package.json"))("sharp");
sharp.concurrency(1);
const file = resolve(process.argv[2]);
const dir = resolve(".netlify/contact-stream");
await mkdir(dir, { recursive: true });
const site = JSON.parse(await readFile("src/content/site.json", "utf8"));
const source = site.pages
  .find((p) => p.slug === "contact-waambat")
  .blocks.find((b) => b.type === "embed" && b.loop).src;
const probe = async (input) => {
  const r = await exec(
    ffmpeg,
    [
      "-hide_banner",
      "-xerror",
      "-i",
      input,
      "-map",
      "0:v:0",
      "-c:v",
      "copy",
      "-an",
      "-f",
      "null",
      "-",
    ],
    { maxBuffer: 1024 * 1024 },
  );
  const frames = Number([...r.stderr.matchAll(/frame=\s*(\d+)/g)].at(-1)?.[1]);
  const dims = r.stderr.match(/Video:.*?, (\d+)x(\d+)/);
  if (!frames || !dims) throw new Error("Invalid animation");
  return { frames, width: Number(dims[1]), height: Number(dims[2]) };
};
const original = await probe(file),
  levels = [];
for (const width of [320, 640]) {
  const playlist = join(dir, width + ".m3u8");
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
      file,
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
      width === 320 ? "29" : "24",
      "-profile:v",
      "high",
      "-level:v",
      "4.0",
      "-pix_fmt",
      "yuv420p",
      "-threads",
      "2",
      "-force_key_frames",
      "expr:gte(t,n_forced*1)",
      "-sc_threshold",
      "0",
      "-f",
      "hls",
      "-hls_time",
      "1",
      "-hls_playlist_type",
      "vod",
      "-hls_segment_type",
      "fmp4",
      "-hls_fmp4_init_filename",
      width + "-init.mp4",
      "-hls_segment_filename",
      join(dir, width + "-%03d.m4s"),
      "-hls_flags",
      "independent_segments",
      playlist,
    ],
    { maxBuffer: 1024 * 1024 },
  );
  const check = await probe(playlist);
  if (check.frames !== original.frames)
    throw new Error("Animation frames changed");
  const text = await readFile(playlist, "utf8"),
    files = [...text.matchAll(/^([^#\n]+\.m4s)$/gm)].map((m) => m[1]),
    durations = [...text.matchAll(/#EXTINF:([\d.]+)/g)].map((m) =>
      Number(m[1]),
    );
  let bytes = 0,
    peak = 0;
  for (let i = 0; i < files.length; i++) {
    const n = (await readFile(join(dir, files[i]))).length;
    bytes += n;
    if (durations[i] >= 1) peak = Math.max(peak, (n * 8) / durations[i]);
  }
  levels.push({
    ...check,
    rendition: width,
    bandwidth: Math.ceil(peak * 1.05),
    average: Math.ceil((bytes * 8) / durations.reduce((a, b) => a + b, 0)),
    bytes,
  });
}
await writeFile(
  join(dir, "master.m3u8"),
  "#EXTM3U\n#EXT-X-VERSION:7\n#EXT-X-INDEPENDENT-SEGMENTS\n" +
    levels
      .map(
        (l) =>
          `#EXT-X-STREAM-INF:BANDWIDTH=${l.bandwidth},AVERAGE-BANDWIDTH=${l.average},RESOLUTION=${l.width}x${l.height},CODECS="avc1.640028"\n${l.rendition}.m3u8\n`,
      )
      .join(""),
);
const digest = createHash("sha256");
for (const n of (await readdir(dir)).sort()) {
  digest.update(n);
  digest.update(await readFile(join(dir, n)));
}
const id = digest.digest("hex").slice(0, 24);
await cp(dir, join("public/streams", id), { recursive: true });
const png = join(".netlify", "contact-poster.png");
await exec(ffmpeg, [
  "-hide_banner",
  "-loglevel",
  "error",
  "-y",
  "-ss",
  "0.1",
  "-i",
  file,
  "-frames:v",
  "1",
  "-threads",
  "1",
  png,
]);
const image = await sharp(png)
  .resize({ width: 768, withoutEnlargement: true })
  .webp({ quality: 76 })
  .toBuffer();
const poster =
  "/paintings/" +
  createHash("sha256").update(image).digest("hex").slice(0, 24) +
  ".webp";
await writeFile("public" + poster, image);
const manifest = JSON.parse(
  await readFile("src/content/adaptive-media.json", "utf8"),
);
manifest.streams[source] = `/streams/${id}/master.m3u8`;
manifest.previews = {
  [source]: { poster, ratio: original.width / original.height },
};
await writeFile(
  "src/content/adaptive-media.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
await writeFile(
  "evidence/contact-media.json",
  JSON.stringify({ source, original, levels }, null, 2) + "\n",
);
console.log(JSON.stringify({ source, original, levels, poster }));
