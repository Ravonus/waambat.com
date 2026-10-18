// Full-duration adaptive display copies. Source/token URLs remain untouched.
import { readFile, writeFile, mkdir, readdir, cp } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.resolve("next/package.json"));
const sharp = require("sharp");
sharp.concurrency(1);
const exec = promisify(execFile);
const ffmpeg = process.env.FFMPEG_BIN || "ffmpeg";
const previous = JSON.parse(
  await readFile("src/content/optimized-media.json", "utf8"),
);
const cache = resolve(process.argv[2] || ".netlify/adaptive-cache");
const output = resolve("public/streams");
await mkdir(cache, { recursive: true });
await mkdir(output, { recursive: true });
const hash = (b) => createHash("sha256").update(b).digest("hex").slice(0, 24);
const sources = previous.paintings.map((p) => ({
  id: p.id,
  source: join("public", p.desktop),
  aliases: [p.original, p.desktop, p.mobile],
  widths: [384, 640, 960],
  frames: p.frames,
}));
for (const [original, src] of Object.entries(previous.hero))
  if (original.endsWith(".mp4"))
    sources.push({
      id: original.split("/").at(-1).replace(".mp4", ""),
      source: join("public", src),
      aliases: [original, src],
      widths: original.includes("mobile") ? [360, 720] : [480, 1280],
    });
const streams = {};
const evidence = [];
for (const item of sources) {
  const dir = join(cache, item.id + "-v1");
  await mkdir(dir, { recursive: true });
  const levels = [];
  for (const width of item.widths) {
    const name = String(width);
    const playlist = join(dir, name + ".m3u8");
    try {
      if (!(await readFile(playlist, "utf8")).includes("#EXT-X-ENDLIST"))
        throw new Error("incomplete cached stream");
    } catch {
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
          item.source,
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
          width === item.widths[0] ? "30" : "25",
          "-profile:v",
          "high",
          "-level:v",
          "4.0",
          "-pix_fmt",
          "yuv420p",
          "-threads",
          "2",
          "-force_key_frames",
          "expr:gte(t,n_forced*2)",
          "-sc_threshold",
          "0",
          "-f",
          "hls",
          "-hls_time",
          "2",
          "-hls_playlist_type",
          "vod",
          "-hls_segment_type",
          "fmp4",
          "-hls_fmp4_init_filename",
          name + "-init.mp4",
          "-hls_segment_filename",
          join(dir, name + "-%03d.m4s"),
          "-hls_flags",
          "independent_segments",
          playlist,
        ],
        { maxBuffer: 1024 * 1024 },
      );
    }
    const text = await readFile(playlist, "utf8");
    const names = [...text.matchAll(/^([^#\n].*\.m4s)$/gm)].map((m) => m[1]);
    const durations = [...text.matchAll(/#EXTINF:([\d.]+)/g)].map((m) =>
      Number(m[1]),
    );
    let bytes = 0,
      peak = 0;
    for (let i = 0; i < names.length; i++) {
      const n = (await readFile(join(dir, names[i]))).length;
      bytes += n;
      if (durations[i] >= 1) peak = Math.max(peak, (n * 8) / durations[i]);
    }
    const probe = await exec(
      ffmpeg,
      [
        "-hide_banner",
        "-i",
        playlist,
        "-map",
        "0:v:0",
        "-c",
        "copy",
        "-f",
        "null",
        "-",
      ],
      { maxBuffer: 1024 * 1024 },
    );
    const frameCount = Number(
      [...probe.stderr.matchAll(/frame=\s*(\d+)/g)].at(-1)?.[1],
    );
    if (!frameCount || (item.frames && item.frames !== frameCount))
      throw new Error("Frame count changed " + item.id + " " + width);
    const dimensions = probe.stderr.match(/Video:.*?, (\d+)x(\d+)/);
    if (!dimensions) throw new Error("Missing dimensions " + item.id);
    const duration = durations.reduce((a, b) => a + b, 0);
    levels.push({
      width,
      frames: frameCount,
      dimensions: `${dimensions[1]}x${dimensions[2]}`,
      bandwidth: Math.ceil(peak * 1.05),
      average: Math.ceil((bytes * 8) / duration),
      bytes,
      duration,
      segments: names.length,
      firstSegmentBytes: (await readFile(join(dir, names[0]))).length,
    });
  }
  const master =
    "#EXTM3U\n#EXT-X-VERSION:7\n#EXT-X-INDEPENDENT-SEGMENTS\n" +
    levels
      .map(
        (l) =>
          `#EXT-X-STREAM-INF:BANDWIDTH=${l.bandwidth},AVERAGE-BANDWIDTH=${l.average},RESOLUTION=${l.dimensions},CODECS="avc1.640028"\n${l.width}.m3u8\n`,
      )
      .join("");
  await writeFile(join(dir, "master.m3u8"), master);
  if (item.id.startsWith("artwork-")) {
    const mobile =
      "#EXTM3U\n#EXT-X-VERSION:7\n#EXT-X-INDEPENDENT-SEGMENTS\n" +
      levels
        .filter((l) => l.width <= 640)
        .map(
          (l) =>
            `#EXT-X-STREAM-INF:BANDWIDTH=${l.bandwidth},AVERAGE-BANDWIDTH=${l.average},RESOLUTION=${l.dimensions},CODECS="avc1.640028"\n${l.width}.m3u8\n`,
        )
        .join("");
    await writeFile(join(dir, "mobile.m3u8"), mobile);
  }
  const names = (await readdir(dir)).sort();
  const digest = createHash("sha256");
  for (const n of names) {
    digest.update(n);
    digest.update(await readFile(join(dir, n)));
  }
  const id = digest.digest("hex").slice(0, 24);
  await cp(dir, join(output, id), { recursive: true });
  for (const alias of item.aliases)
    streams[alias] =
      `/streams/${id}/${item.id.startsWith("artwork-") && alias === previous.paintings.find((p) => p.id === item.id)?.mobile ? "mobile" : "master"}.m3u8`;
  evidence.push({ id: item.id, levels });
  console.log(JSON.stringify(evidence.at(-1)));
}
const posters = process.env.ADAPTIVE_REUSE_POSTERS
  ? JSON.parse(await readFile("src/content/adaptive-media.json", "utf8"))
      .posters
  : {};
if (!process.env.ADAPTIVE_REUSE_POSTERS)
  for (const p of previous.paintings) {
    const dir = join(cache, p.id + "-poster");
    await mkdir(dir, { recursive: true });
    const renditions = [];
    for (const width of [384, 640, 768, 960]) {
      const base = sharp(join("public", p.originalPoster)).resize({
        width,
        withoutEnlargement: true,
      });
      renditions.push({
        width,
        webp: await base.clone().webp({ quality: 74, effort: 5 }).toBuffer(),
        avif: await base.clone().avif({ quality: 45, effort: 5 }).toBuffer(),
      });
    }
    const id = hash(Buffer.concat(renditions.flatMap((r) => [r.webp, r.avif])));
    for (const r of renditions)
      for (const ext of ["webp", "avif"])
        await writeFile(
          join("public/paintings", `${id}-${r.width}.${ext}`),
          r[ext],
        );
    posters[p.poster] = `/paintings/${id}-960.webp`;
  }
// A representative still paints immediately while the intro buffers. Playback remains complete.
if (!process.env.ADAPTIVE_REUSE_POSTERS)
  for (const [original, src] of Object.entries(previous.hero))
    if (original.endsWith(".mp4") && !original.includes("loop")) {
      const png = join(
        cache,
        original.includes("mobile") ? "hero-mobile.png" : "hero-desktop.png",
      );
      await exec(ffmpeg, [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-ss",
        "1",
        "-i",
        join("public", src),
        "-frames:v",
        "1",
        "-threads",
        "1",
        png,
      ]);
      const image = await sharp(png)
        .resize({
          width: original.includes("mobile") ? 768 : 1280,
          withoutEnlargement: true,
        })
        .webp({ quality: 76 })
        .toBuffer();
      const name = hash(image) + ".webp";
      await writeFile(join("public/paintings", name), image);
      const posterOriginal = original.includes("mobile")
        ? "/hero/waambat-hero-poster-mobile.webp"
        : "/hero/waambat-hero-poster.webp";
      posters[posterOriginal] = `/paintings/${name}`;
      posters[previous.hero[posterOriginal]] = `/paintings/${name}`;
    }
await writeFile(
  "src/content/adaptive-media.json",
  JSON.stringify({ streams, posters }, null, 2) + "\n",
);
await mkdir("evidence", { recursive: true });
await writeFile(
  "evidence/adaptive-media.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
