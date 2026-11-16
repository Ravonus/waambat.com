import records from "#/content/video-previews.json";
import type { MediaAsset } from "@kerf-js/core/media";
type Preview = Pick<MediaAsset, "src" | "type" | "width" | "height" | "sources"> & {
  revealAt?: number;
};
const catalog = records as { sources: Record<string, string>; assets: Record<string, Preview> };
/** Only the selected responsive display picture is part of the browser's playback contract. */
export function firstFramePreview(source: string | undefined) {
  return catalog.assets[catalog.sources[source ?? ""] ?? ""];
}
export function videoRevealTime(source: string | undefined) {
  return firstFramePreview(source)?.revealAt ?? 0;
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
