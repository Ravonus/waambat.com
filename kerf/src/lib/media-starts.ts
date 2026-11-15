import { adaptiveStream } from "./adaptive-media";
/** Warm the actual responsive source, starting wherever the reader is now. */
export function mediaWarmTargets() {
  return [...document.querySelectorAll<HTMLElement>("[data-media-start], [data-save-url]")].flatMap(
    (node) => {
      const source = node.dataset.mediaStart ?? node.dataset.saveUrl,
        url = source ? adaptiveStream(source) : undefined;
      if (!url) return [];
      const frame = node.querySelector("video, picture") ?? node,
        box = frame.getBoundingClientRect();
      const image = node.querySelector<HTMLImageElement>("img[data-video-first-frame]");
      return [
        {
          url,
          width: box.width || Math.min(innerWidth, 960),
          height: box.height || (box.width * 9) / 16 || 540,
          priority: () => {
            const rect = frame.getBoundingClientRect();
            return rect.bottom < 0 ? -rect.bottom : Math.max(0, rect.top - innerHeight);
          },
          prepare: async () => {
            if (!image) return;
            if (image.fetchPriority !== "high") image.fetchPriority = "low";
            image.loading = "eager";
            image.dispatchEvent(new Event("kerf:prepare-poster"));
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            await image.decode().catch(() => {});
          },
        },
      ];
    },
  );
}
