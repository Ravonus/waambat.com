// Browser rendering never needs video records or the discarded blur placeholders.
// Originals, compatibility copies and animated-image metadata remain intact.
import fs from "node:fs/promises";
import path from "node:path";
export function imageIndex(records) {
  return Object.fromEntries(
    Object.entries(records)
      .filter(([, asset]) => asset.type?.startsWith("image/"))
      .map(([source, asset]) => {
        const { placeholder, displayVerification, ...image } = asset;
        return [source, image];
      }),
  );
}
export async function writeImageIndex(root = process.cwd()) {
  const source = await fs.readFile(path.join(root, "src/content/local-media.json"), "utf8");
  const previews = await fs
    .readFile(path.join(root, "src/content/display-previews.json"), "utf8")
    .then(JSON.parse)
    .catch(() => ({ images: {} }));
  const target = path.join(root, "src/content/image-media.json"),
    value = JSON.stringify(imageIndex({ ...JSON.parse(source), ...previews.images })) + "\n";
  if ((await fs.readFile(target, "utf8").catch(() => "")) !== value) {
    const temporary = target + ".tmp-" + process.pid;
    await fs.writeFile(temporary, value);
    await fs.rename(temporary, target);
  }
  return { sourceBytes: Buffer.byteLength(source), imageBytes: Buffer.byteLength(value) };
}
