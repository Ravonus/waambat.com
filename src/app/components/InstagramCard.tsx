"use client";
import { useState } from "react";
import type { Artwork } from "~/lib/content";
import { instagramTarget } from "~/lib/instagram";
import SourceImage from "./SourceImage";
export default function InstagramCard({ artwork }: { artwork: Artwork }) {
  const target = instagramTarget(artwork.tokenLink);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const loaded = loadedSource === artwork.tokenLink;
  const failed = failedSource === artwork.tokenLink;
  if (!target) return null;
  const label = artwork.title || `Instagram ${target.type}`;
  return (
    <article
      data-instagram={artwork.id}
      className="mb-10 border border-white/20 p-4 text-center"
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
              setLoadedSource(null);
            }}
          />
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setLoadedSource(null);
            }}
            className="mx-auto mb-3 block text-xs underline"
          >
            Close Instagram preview
          </button>
        </>
      ) : target.embed && !failed ? (
        <>
          <button
            type="button"
            onClick={() => setLoadedSource(artwork.tokenLink)}
            className="border-waambat-pink mb-3 rounded border px-4 py-2"
          >
            Load Instagram {target.type}
          </button>
          <p className="mb-3 text-xs text-white/65">
            Loading connects to Instagram. A public post may require sign-in or
            have embedding disabled.
          </p>
        </>
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
