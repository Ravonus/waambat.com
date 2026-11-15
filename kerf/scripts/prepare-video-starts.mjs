import fs from "node:fs/promises";
import path from "node:path";
import { prepareVideoStartup } from "./media/video-start.mjs";
import { createMediaEncode } from "@kerf-js/media-ffmpeg/build";
const root = path.resolve("../public");
const file = "src/content/first-frames.json",
  receipt = "media/first-frame-manifest.json";
const catalog = JSON.parse(await fs.readFile(file, "utf8"));
const manifest = JSON.parse(await fs.readFile(receipt, "utf8"));
const inventory = JSON.parse(await fs.readFile("media/source-manifest.json", "utf8"));
const encode = { "video/h264": createMediaEncode({ key: "video/h264", timeout: 600000 }) };
for (const [id, asset] of Object.entries(catalog.assets)) {
  const source = Object.keys(catalog.sources).find(
    (source) => catalog.sources[source] === id && inventory.entries[source],
  );
  if (!source) continue;
  const startup = await prepareVideoStartup({
    file: path.join(root, inventory.entries[source].original.file),
    asset,
    root,
    encode,
    known: asset.startup,
  });
  if (!startup) continue;
  asset.startup = startup;
  manifest.entries[source].asset.startup = startup;
  console.log(JSON.stringify({ source, revealAt: startup.revealAt, preview: startup.preview.src }));
}
for (const [target, data] of [
  [file, catalog],
  [receipt, manifest],
]) {
  const json = JSON.stringify(data);
  if (await fs.readFile(target, 'utf8').catch(() => '') === json) continue;
  const temporary = target + ".tmp-" + process.pid;
  await fs.writeFile(temporary, json);
  await fs.rename(temporary, target);
}
