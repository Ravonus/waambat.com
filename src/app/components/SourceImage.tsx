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
  const responsive = src.startsWith("https://images.squarespace-cdn.com/");
  const variant = (width: number) =>
    `${src}${src.includes("?") ? "&" : "?"}format=${width}w`;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Retains the original CDN and its responsive renditions.
    <img
      src={responsive ? variant(1000) : src}
      srcSet={
        responsive
          ? `${variant(100)} 100w, ${variant(300)} 300w, ${variant(500)} 500w, ${variant(1000)} 1000w, ${variant(1500)} 1500w`
          : undefined
      }
      sizes={sizes}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
}
