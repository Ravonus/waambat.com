// Reuse Kerf's measured encoders. Exact frame-zero records and Save assets remain separate.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
import { createFirstFrameBuild, createMediaBuild } from "@kerf-js/media/build";
import { createMediaEncode } from "@kerf-js/media-ffmpeg/build";
const root = path.resolve("../public"),
  destination = path.join(root, "display-previews");
const file = "src/content/display-previews.json",
  policy = { version: 1, target: 90, widths: [384, 672, 960, 1600], scorer: "ssimulacra2" };
const catalog = JSON.parse(await fs.readFile("src/content/first-frames.json", "utf8"));
const inventory = JSON.parse(await fs.readFile("media/source-manifest.json", "utf8"));
const output = await fs
  .readFile(file, "utf8")
  .then(JSON.parse)
  .catch(() => ({ policy, frames: {}, images: {} }));
if (JSON.stringify(output.policy) !== JSON.stringify(policy))
  throw new Error("Display preview policy changed; start a new version");
sharp.concurrency(2);
await fs.mkdir(destination, { recursive: true });
const encode = { "video/h264": createMediaEncode({ key: "video/h264", timeout: 600000 }) };
const cacheDir = path.resolve(".kerf/display-preview-cache");
const publish = (asset) => ({
  ...asset,
  src: "/display-previews/" + asset.src,
  sources: asset.sources.map((s) => ({
    ...s,
    srcset: s.srcset
      .split(", ")
      .map((r) => "/display-previews/" + r)
      .join(", "),
  })),
});
let saving = Promise.resolve();
const save = () =>
  (saving = saving.then(async () => {
    const temp = file + ".tmp";
    await fs.writeFile(temp, JSON.stringify(output));
    await fs.rename(temp, file);
  }));
const exists = async (asset) =>
  asset &&
  (
    await Promise.all(
      asset.sources.flatMap((s) =>
        s.srcset.split(", ").map((r) =>
          fs.access(path.join(root, r.split(" ")[0])).then(
            () => true,
            () => false,
          ),
        ),
      ),
    )
  ).every(Boolean);
const write = async (built) => {
  for (const f of built.files) await fs.writeFile(path.join(destination, f.name), f.bytes);
};
const critical = [
  "https://i.imgur.com/7ouIHyN.mp4",
  "https://i.imgur.com/JC0hAbH.mp4",
  "/previews/lux-9b87c251ff.mp4",
];
const ranks = new Map(critical.map((s, i) => [catalog.sources[s], i]));
const frames = Object.entries(catalog.assets).sort(
  ([a], [b]) => (ranks.get(a) ?? 99) - (ranks.get(b) ?? 99),
);
const jobs = [];
for (const [id, original] of frames) {
  const source = Object.keys(catalog.sources).find(
    (s) => catalog.sources[s] === id && inventory.entries[s],
  );
  if (!source) {
    console.log(JSON.stringify({ missingSource: id }));
    continue;
  }
  jobs.push(async () => {
    if (await exists(output.frames[id]?.asset)) return;
    const at = original.startup?.revealAt ?? 0;
    const built = await createFirstFrameBuild({
      widths: policy.widths,
      target: policy.target,
      scorer: policy.scorer,
      at,
    }).build(
      { file: path.join(root, inventory.entries[source].original.file) },
      { cacheDir, encode },
    );
    if (built.asset.quality !== "ssimulacra2")
      throw new Error("Measured preview requires SSIMULACRA2: " + source);
    await write(built);
    output.frames[id] = { asset: publish(built.asset), verification: built.verification };
    await save();
    console.log(
      JSON.stringify({
        kind: "frame",
        source,
        done: Object.keys(output.frames).length,
        bytes: built.files.reduce((n, f) => n + f.bytes.length, 0),
        scores: built.verification.scores,
      }),
    );
  });
}
const raster = createMediaBuild({
  formats: ["avif", "webp"],
  widths: policy.widths,
  quality: { lossless: false, target: policy.target, scorer: policy.scorer },
  placeholder: false,
  encoder: "off",
});
const local = JSON.parse(await fs.readFile("src/content/local-media.json", "utf8"));
const seen = new Set();
for (const [source, entry] of Object.entries(inventory.entries)) {
  if (!/\.(png|jpe?g|webp|avif)$/i.test(entry.original.file) || seen.has(entry.original.file))
    continue;
  seen.add(entry.original.file);
  const record = local[source];
  if (!record || record.animated) continue;
  jobs.push(async () => {
    if (await exists(output.images[source])) return;
    const input = path.join(root, entry.original.file),
      bytes = await fs.readFile(input),
      meta = await sharp(bytes, { animated: true }).metadata();
    if ((meta.pages ?? 1) > 1) return;
    const built = await raster.build({ file: input, bytes }, { cacheDir });
    if (built.asset?.quality !== "ssimulacra2") throw new Error("Unmeasured raster: " + source);
    // The general image encoder searches at the largest width. Independently qualify
    // every delivered rung too; formats below the floor retain the exact legacy fallback.
    const checks = await fs.mkdtemp(path.join(cacheDir, "image-check-")),
      scores = [],
      qualified = [];
    try {
      for (const source of built.asset.sources) {
        if (source.type === "image/png") continue;
        let valid = true;
        for (const rung of source.srcset.split(", ")) {
          const [name, widthText] = rung.split(" "),
            width = Number.parseInt(widthText),
            encoded = built.files.find((f) => f.name === name);
          const reference = path.join(checks, "reference.png"),
            candidate = path.join(checks, "candidate.png");
          await sharp(bytes).rotate().resize({ width }).png().toFile(reference);
          await sharp(encoded.bytes).png().toFile(candidate);
          const { stdout } = await exec(policy.scorer, [reference, candidate], {
            timeout: 30000,
            maxBuffer: 4096,
          });
          const score = Number.parseFloat(stdout);
          scores.push({ width, type: source.type, score });
          if (!Number.isFinite(score) || score < policy.target) valid = false;
        }
        if (valid) qualified.push(source);
      }
    } finally {
      await fs.rm(checks, { recursive: true, force: true });
    }
    const names = new Set(
      qualified.flatMap((s) => s.srcset.split(", ").map((r) => r.split(" ")[0])),
    );
    await write({ files: built.files.filter((f) => names.has(f.name)) });
    const efficient = publish({ ...built.asset, sources: qualified });
    const asset = {
      ...record,
      sources: [...efficient.sources, ...record.sources],
      quality: "ssimulacra2",
      displayVerification: { target: policy.target, scores },
    };
    for (const alias of [
      source,
      "/" + entry.original.file,
      ...Object.keys(local).filter((k) => local[k].src === record.src),
    ])
      output.images[alias] = asset;
    await save();
    console.log(
      JSON.stringify({
        kind: "image",
        source,
        done: seen.size,
        bytes: built.files.reduce((n, f) => n + f.bytes.length, 0),
      }),
    );
  });
}
// A single owned writer and at most two encodes; no visitor-side work or original downloads.
// The short save operation is serialized so concurrent encode completions cannot lose records.
let cursor = 0;
await Promise.all(
  Array.from({ length: 2 }, async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      await job();
    }
  }),
);
await save();
console.log(
  JSON.stringify({
    complete: true,
    frames: Object.keys(output.frames).length,
    images: Object.keys(output.images).length,
  }),
);
