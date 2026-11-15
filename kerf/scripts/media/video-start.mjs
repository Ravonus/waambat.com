// Keep exact frame-zero assets, but do not use a black slate as a gallery preview.
// Analysis happens during media preparation; visitors never sample video pixels.
import sharp from "sharp";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { createFirstFrameBuild } from "@kerf-js/media/build";
const exec = promisify(execFile);

export function leadingBlackEnd(log) {
  const first = /black_start:([\d.]+)\s+black_end:([\d.]+)/.exec(log);
  return first && Number(first[1]) <= 0.05 ? Number(first[2]) : undefined;
}

export async function inspectVideoStart(file, still, binary = process.env.FFMPEG_PATH || "ffmpeg") {
  const stats = await sharp(still).removeAlpha().stats();
  if (!stats.channels.slice(0, 3).every((channel) => channel.mean < 2) || stats.entropy >= 0.1)
    return undefined;
  const limit = 20;
  const { stderr } = await exec(
    binary,
    [
      "-hide_banner",
      "-nostats",
      "-threads",
      "1",
      "-i",
      file,
      "-t",
      String(limit),
      "-vf",
      "scale=64:64,blackdetect=d=0.01:pic_th=0.99:pix_th=0.10",
      "-an",
      "-sn",
      "-dn",
      "-f",
      "null",
      "-",
    ],
    { timeout: 45000, maxBuffer: 1024 * 1024 },
  );
  const first = leadingBlackEnd(stderr);
  if (first === undefined || first >= limit - 0.1)
    throw new Error("No visible opening frame found within the bounded video scan: " + file);
  // A fade may end blackdetect while still looking empty. Select a readable frame
  // within the bounded opening instead of encoding that almost-black fade step.
  for (let revealAt = first; revealAt < limit; revealAt += 0.25) {
    const { stdout } = await exec(
      binary,
      [
        "-v",
        "error",
        "-threads",
        "1",
        "-ss",
        String(revealAt),
        "-i",
        file,
        "-frames:v",
        "1",
        "-vf",
        "scale=64:-2",
        "-an",
        "-sn",
        "-dn",
        "-f",
        "image2pipe",
        "-vcodec",
        "png",
        "pipe:1",
      ],
      { timeout: 10000, maxBuffer: 1024 * 1024, encoding: "buffer" },
    );
    const sample = await sharp(stdout).removeAlpha().stats();
    const brightness =
      sample.channels.slice(0, 3).reduce((sum, channel) => sum + channel.mean, 0) / 3;
    if (brightness >= 8 && (sample.entropy >= 1 || brightness >= 32))
      return { version: 1, blank: true, revealAt: Number(revealAt.toFixed(6)) };
  }
  throw new Error("No readable opening frame found within the bounded video scan: " + file);
}

/** Encode the measured visible opening with Kerf; keep the original frame-zero record separate. */
export async function prepareVideoStartup({ file, asset, root, encode, known }) {
  const startup =
    known?.version === 1 ? known : await inspectVideoStart(file, path.join(root, asset.src));
  if (!startup) return startup;
  if (startup.preview) {
    const files = startup.preview.sources.flatMap(source => source.srcset.split(', ').map(rung => rung.split(' ')[0]));
    const present = await Promise.all(files.map(file => fs.access(path.join(root, file)).then(() => true, () => false)));
    if (present.every(Boolean)) return startup;
  }
  const frame = await createFirstFrameBuild({
    widths: [384, 640, 960, 1600],
    target: 100,
    scorer: "none",
    at: startup.revealAt,
  }).build({ file }, { cacheDir: path.resolve(".kerf/media-preview-cache"), encode });
  const destination = path.join(root, "video-previews");
  await fs.mkdir(destination, { recursive: true });
  for (const output of frame.files)
    await fs.writeFile(path.join(destination, output.name), output.bytes);
  const preview = {
    ...frame.asset,
    src: "/video-previews/" + frame.asset.src,
    sources: frame.asset.sources.map((source) => ({
      ...source,
      srcset: source.srcset
        .split(", ")
        .map((rung) => "/video-previews/" + rung)
        .join(", "),
    })),
  };
  return { ...startup, preview, verification: frame.verification };
}
