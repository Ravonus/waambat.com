// JPEGs are safe to resize. GIF, APNG and animated WebP must retain their
// exact source because a rendition service can flatten animation to a still.
export function sourceImageSet(src: string) {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return { src, srcSet: undefined };
  }
  if (
    url.hostname !== "images.squarespace-cdn.com" ||
    !/\.jpe?g$/i.test(url.pathname)
  )
    return { src, srcSet: undefined };
  const variant = (width: number) => {
    const rendition = new URL(url);
    rendition.searchParams.set("format", `${width}w`);
    return rendition.href;
  };
  return {
    src: variant(1000),
    srcSet: [100, 300, 500, 1000, 1500]
      .map((width) => `${variant(width)} ${width}w`)
      .join(", "),
  };
}
