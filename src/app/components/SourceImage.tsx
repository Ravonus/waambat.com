import { sourceImageSet } from "~/lib/source-image";
export default function SourceImage({
  src,
  alt,
  eager = false,
  className = "",
  sizes = "(max-width: 767px) calc(100vw - 40px), 960px",
}: {
  src: string;
  alt: string;
  eager?: boolean;
  className?: string;
  sizes?: string;
}) {
  const source = sourceImageSet(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Retains the original CDN and its responsive renditions.
    <img
      src={source.src}
      srcSet={source.srcSet}
      sizes={sizes}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      decoding="async"
      className={className}
    />
  );
}
