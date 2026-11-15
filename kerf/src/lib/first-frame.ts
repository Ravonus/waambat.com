import records from "#/content/first-frames.json";
import delivery from "#/content/display-previews.json";
import type { MediaAsset } from "@kerf-js/core/media";
type FirstFrameAsset = MediaAsset & {
  startup?: { blank: true; revealAt: number; preview?: MediaAsset };
};
const catalog = records as {
  sources: Record<string, string>;
  assets: Record<string, FirstFrameAsset>;
};
/** A sharp, measured first frame; the original movie remains a separate save asset. */
export function firstFrame(source: string | undefined) {
  return catalog.assets[catalog.sources[source ?? ""] ?? ""];
}
/** Kerf's measured display preview is separate from the retained exact frame and original Save. */
export function firstFramePreview(source: string | undefined) {
  const asset = firstFrame(source);
  const id = catalog.sources[source ?? ""];
  const preview = (delivery.frames as Record<string, { asset: MediaAsset }>)[id ?? ""];
  if (preview) return preview.asset;
  return asset?.startup?.blank ? asset.startup.preview : asset;
}
export function videoRevealTime(source: string | undefined) {
  return firstFrame(source)?.startup?.revealAt ?? 0;
}
export function firstFramePoster(source: string | undefined, fallback: string) {
  const asset = firstFramePreview(source);
  if (!asset) return fallback;
  const webp = asset.sources.find((item) => item.type === "image/webp") ?? asset.sources.at(-1);
  return (
    webp?.srcset
      .split(", ")
      .find((rung) => Number.parseInt(rung.split(" ")[1]!) >= 640)
      ?.split(" ")[0] ?? asset.src
  );
}
