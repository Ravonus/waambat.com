// Browser playback needs selected pictures and reveal times, never encoder receipts or exact source records.
import fs from "node:fs/promises";
import path from "node:path";
export async function writeVideoIndex(root = process.cwd()) {
  const source = JSON.parse(
    await fs.readFile(path.join(root, "src/content/first-frames.json"), "utf8"),
  );
  const display = JSON.parse(
    await fs.readFile(path.join(root, "src/content/display-previews.json"), "utf8"),
  );
  const assets = Object.fromEntries(
    Object.entries(source.assets).map(([id, original]) => {
      const selected = display.frames[id]?.asset ?? original.startup?.preview ?? original;
      const { src, type, width, height, sources } = selected;
      return [
        id,
        {
          src,
          type,
          width,
          height,
          sources,
          ...(original.startup?.revealAt ? { revealAt: original.startup.revealAt } : {}),
        },
      ];
    }),
  );
  const target = path.join(root, "src/content/video-previews.json"),
    value = JSON.stringify({ sources: source.sources, assets }) + "\n";
  if ((await fs.readFile(target, "utf8").catch(() => "")) !== value) {
    const temp = target + ".tmp";
    await fs.writeFile(temp, value);
    await fs.rename(temp, target);
  }
  return { videoPreviewBytes: Buffer.byteLength(value), assets: Object.keys(assets).length };
}
