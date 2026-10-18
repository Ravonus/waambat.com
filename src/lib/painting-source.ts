export function paintingPoster(src: string) {
  const hashed = /^\/paintings\/[a-f0-9]{24}-960\.webp$/.test(src);
  const original = /^\/posters\/\d+-960\.webp$/.test(src);
  return {
    hashed,
    local: hashed || original,
    srcSet: hashed
      ? [384, 640, 960]
          .map((width) => `${src.replace("-960", `-${width}`)} ${width}w`)
          .join(", ")
      : original
        ? `${src.replace("-960", "-480")} 480w, ${src} 960w`
        : undefined,
    avif: hashed
      ? [384, 640, 960]
          .map(
            (width) =>
              `${src.replace("-960.webp", `-${width}.avif`)} ${width}w`,
          )
          .join(", ")
      : undefined,
  };
}
