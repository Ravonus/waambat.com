import media from "~/content/adaptive-media.json";
const streams: Record<string, string> = media.streams;
const posters: Record<string, string> = media.posters;
export const adaptiveStream = (source: string) => streams[source];
export const adaptivePoster = (source: string) => posters[source] ?? source;

const responsivePosters = new Set(
  Object.values(posters).filter((src) => src.endsWith("-960.webp")),
);
export const isAdaptivePoster = (source: string) =>
  responsivePosters.has(source);

export const adaptivePreview = (source: string) =>
  (media as { previews?: Record<string, { poster: string; ratio: number }> })
    .previews?.[source];
