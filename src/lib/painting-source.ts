import { isAdaptivePoster } from "./adaptive-media";
export function paintingPoster(src: string) {
  const hashed = /^\/paintings\/[a-f0-9]{24}-960\.webp$/.test(src);
  const original = /^\/posters\/\d+-960\.webp$/.test(src);
  const widths = isAdaptivePoster(src) ? [384, 640, 768, 960] : [384, 640, 960];
  return {
    hashed,
    local: hashed || original,
    srcSet: hashed
      ? widths
          .map((width) => `${src.replace("-960", `-${width}`)} ${width}w`)
          .join(", ")
      : original
        ? `${src.replace("-960", "-480")} 480w, ${src} 960w`
        : undefined,
    avif: hashed
      ? widths
          .map(
            (width) =>
              `${src.replace("-960.webp", `-${width}.avif`)} ${width}w`,
          )
          .join(", ")
      : undefined,
  };
}
