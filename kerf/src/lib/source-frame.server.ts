import records from "#/content/first-frames.json";
import type { MediaAsset } from "@kerf-js/core/media";
type SourceFrame = MediaAsset & {
  startup?: { blank: true; revealAt: number; preview?: MediaAsset };
};
const catalog = records as { sources: Record<string, string>; assets: Record<string, SourceFrame> };
/** Build provenance only. Public playback imports the generated video-preview index instead. */
export function firstFrame(source: string | undefined) {
  return catalog.assets[catalog.sources[source ?? ""] ?? ""];
}
