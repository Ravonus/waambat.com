"use client";
import { useEffect, useRef, useState } from "react";
import type { Artwork } from "~/lib/content";
import { instagramTarget } from "~/lib/instagram";
import SourceImage from "./SourceImage";
export default function InstagramCard({ artwork }: { artwork: Artwork }) {
  const target = instagramTarget(artwork.tokenLink);
  const container = useRef<HTMLElement>(null);
  const dismissed = useRef<string | null>(null);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const loaded = loadedSource === artwork.tokenLink;
  const failed = failedSource === artwork.tokenLink;
  useEffect(() => {
    const element = container.current;
    if (!element || !instagramTarget(artwork.tokenLink)?.embed) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && dismissed.current !== artwork.tokenLink)
          setLoadedSource(artwork.tokenLink);
      },
      { threshold: 0.01 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [artwork.tokenLink]);
  if (!target) return null;
  const label = artwork.title || `Instagram ${target.type}`;
  return (
    <article
      ref={container}
      data-instagram={artwork.id}
      className="mb-10 min-h-[540px] text-center"
    >
      {artwork.featured && (
        <p className="text-waambat-pink mb-3 text-xs">Featured</p>
      )}
      {artwork.poster && !loaded && (
        <a href={target.canonical} target="_blank" rel="noopener noreferrer">
          <SourceImage
            src={artwork.poster}
            alt={label}
            className="mb-4 aspect-square w-full object-contain"
          />
        </a>
      )}
      {artwork.title && (
        <h2 className="text-waambat-pink mb-3 text-[22px]">{artwork.title}</h2>
      )}
      {artwork.description && (
        <p className="mb-4 whitespace-pre-line">{artwork.description}</p>
      )}
      {loaded && target.embed && !failed ? (
        <>
          <iframe
            src={target.embed}
            title={label}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            allow="fullscreen"
            className="mx-auto mb-4 block h-[540px] w-full max-w-[500px] border-0 bg-black"
            onError={() => {
              setFailedSource(artwork.tokenLink);
              dismissed.current = artwork.tokenLink;
              setLoadedSource(null);
            }}
          />
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              dismissed.current = artwork.tokenLink;
              setLoadedSource(null);
            }}
            className="mx-auto mb-3 block text-xs underline"
          >
            Close Instagram preview
          </button>
        </>
      ) : target.embed && !failed ? (
        <p className="text-sm text-white/65">
          Instagram preview loads when visible.
        </p>
      ) : (
        <p className="mb-3 text-sm text-white/65">
          {target.type === "highlight"
            ? "Highlights open on Instagram."
            : "The preview is unavailable. Open the original on Instagram."}
        </p>
      )}
      <a
        href={target.canonical}
        target="_blank"
        rel="noopener noreferrer"
        className="text-waambat-link inline-block"
      >
        View on Instagram ↗
      </a>
      <p className="mt-3 text-xs text-white/65">
        If a post is private, deleted or unavailable, this original link remains
        here.
      </p>
    </article>
  );
}
