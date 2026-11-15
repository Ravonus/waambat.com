// Reuse byte-identical retained files; delete only this task's unreferenced generated previews.
import fs from "node:fs/promises";
import path from "node:path";
const root = path.resolve("../public"),
  file = "src/content/display-previews.json";
let json = await fs.readFile(file, "utf8");
const urls = [...new Set(json.match(/\/display-previews\/[A-Za-z0-9._-]+/g))];
let reused = 0;
for (const url of urls) {
  const name = path.basename(url),
    data = await fs.readFile(path.join(root, url));
  for (const folder of ["media-optimized", "video-previews"]) {
    const prior = await fs.readFile(path.join(root, folder, name)).catch(() => undefined);
    if (prior?.equals(data)) {
      json = json.replaceAll(url, "/" + folder + "/" + name);
      reused++;
      break;
    }
  }
}
await fs.writeFile(file, json);
const retained = new Set(
  (json.match(/\/display-previews\/[A-Za-z0-9._-]+/g) ?? []).map((u) => path.basename(u)),
);
let removed = 0;
for (const name of await fs.readdir(path.join(root, "display-previews"))) {
  if (retained.has(name)) continue;
  await fs.unlink(path.join(root, "display-previews", name));
  removed++;
}
console.log(JSON.stringify({ reused, removed, files: retained.size }));
