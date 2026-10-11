import { execFileSync } from "node:child_process";
import { mkdirSync, realpathSync, existsSync } from "node:fs";
import { resolve } from "node:path";
const [input, folder] = process.argv.slice(2);
if (!input || !folder)
  throw new Error(
    "Usage: pnpm media:prepare <approved-local-original> <new-output-directory>",
  );
const source = realpathSync(input);
const output = resolve(folder);
if (existsSync(output))
  throw new Error(
    "Choose a new directory. Originals and existing outputs will not be overwritten.",
  );
mkdirSync(output, { recursive: true });
for (const [width, crf] of [
  [480, 22],
  [960, 20],
])
  execFileSync(
    "ffmpeg",
    [
      "-n",
      "-i",
      source,
      "-map",
      "0:v:0",
      "-an",
      "-vf",
      `scale='min(${width},iw)':-2`,
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      String(crf),
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      `${output}/video-${width}.mp4`,
    ],
    { stdio: "inherit" },
  );
for (const width of [480, 960])
  execFileSync(
    "ffmpeg",
    [
      "-n",
      "-i",
      source,
      "-frames:v",
      "1",
      "-vf",
      `scale='min(${width},iw)':-2`,
      "-quality",
      "88",
      `${output}/poster-${width}.webp`,
    ],
    { stdio: "inherit" },
  );
console.log(
  "Review both derivatives for loop continuity and color before uploading. The original is unchanged.",
);
