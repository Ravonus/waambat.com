// A deploy checks committed delivery records; it never encodes on visitors or silently lowers quality.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve("../public"),
  catalog = JSON.parse(await fs.readFile("src/content/display-previews.json", "utf8"));
const frames = JSON.parse(await fs.readFile("src/content/first-frames.json", "utf8"));
const files = new Set();
for (const [id, record] of Object.entries(frames.assets)) {
  const preview = catalog.frames[id];
  if (!preview) throw new Error("Missing measured frame: " + id);
  const v = preview.verification;
  if (
    v.sourceSha256 !== id ||
    v.target < catalog.policy.target ||
    v.placeholder !== "none" ||
    v.frameTime !== (record.startup?.revealAt ?? 0)
  )
    throw new Error("Invalid first-frame verification: " + id);
  for (const source of preview.asset.sources) {
    const format = source.type.split("/")[1];
    for (const rung of source.srcset.split(", ")) {
      const [url, widthText] = rung.split(" "),
        width = Number.parseInt(widthText);
      const score = format === "png" ? 100 : v.scores.find((s) => s.width === width)?.[format];
      if (!Number.isFinite(score) || score < catalog.policy.target)
        throw new Error("Preview below quality floor: " + url);
      files.add(url);
    }
  }
}
for (const asset of Object.values(catalog.images))
  for (const source of asset.sources)
    for (const rung of source.srcset.split(", ")) files.add(rung.split(" ")[0]);
let bytes = 0;
for (const url of files) {
  const file = path.resolve(root, "." + url);
  if (!file.startsWith(root + path.sep)) throw new Error("Invalid preview path");
  const data = await fs.readFile(file);
  bytes += data.length;
  if (url.startsWith("/display-previews/")) {
    const digest = /-(\w+)\.(?:avif|webp|jpe?g|png)$/.exec(url)?.[1];
    if (!digest || !createHash("sha256").update(data).digest("hex").startsWith(digest))
      throw new Error("Preview identity mismatch: " + url);
  }
}
console.log(
  JSON.stringify({
    verified: true,
    frames: Object.keys(catalog.frames).length,
    imageAliases: Object.keys(catalog.images).length,
    files: files.size,
    bytes,
    policy: catalog.policy,
  }),
);
