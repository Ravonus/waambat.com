import manifest from "~/content/optimized-media.json";
import type { Content } from "./content";
type Manifest = {
  paintings: {
    original: string;
    desktop: string;
    mobile: string;
    originalPoster: string;
    poster: string;
  }[];
  hero: Record<string, string>;
};
const optimized = manifest as Manifest;
export function optimizeStoredMedia(content: Content) {
  if (content.mediaOptimizationVersion >= 1) return { content, changed: false };
  const next = structuredClone(content);
  for (const section of next.sections)
    for (const item of section.items) {
      const painting = optimized.paintings.find(
        (entry) => entry.original === item.videoSrc,
      );
      if (painting) {
        if (!item.previewSrc) item.previewSrc = painting.desktop;
        if (!item.mobileVideoSrc) item.mobileVideoSrc = painting.mobile;
        if (item.poster === painting.originalPoster)
          item.poster = painting.poster;
      }
      if (section.presentation === "hero")
        for (const field of [
          "videoSrc",
          "mobileVideoSrc",
          "loopSrc",
          "mobileLoopSrc",
          "poster",
          "mobilePoster",
        ] as const) {
          const replacement = optimized.hero[item[field]];
          if (replacement) item[field] = replacement;
        }
    }
  next.mediaOptimizationVersion = 1;
  return { content: next, changed: true };
}
