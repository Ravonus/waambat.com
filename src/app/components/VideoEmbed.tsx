"use client";
import { useState } from "react";
import { videoSource } from "~/lib/video-source";
import SourceImage from "./SourceImage";
export default function VideoEmbed({
  src,
  title,
  poster = "",
  activated = false,
  ratio,
  compact = false,
}: {
  src: string;
  title: string;
  poster?: string;
  activated?: boolean;
  ratio?: number;
  compact?: boolean;
}) {
  const [loadedSource, setLoadedSource] = useState<string | null>(
    activated ? src : null,
  );
  const loaded = loadedSource === src;
  const target = videoSource(src);
  if (!target)
    return <p>Unsupported source. Review this entry in the studio.</p>;
  return (
    <figure className={compact ? "h-full w-full" : "my-8 w-full"}>
      <div
        className={`relative bg-black ${target.provider === "ordinals" ? "aspect-square" : "aspect-video"}`}
        style={ratio ? { aspectRatio: ratio } : undefined}
      >
        {loaded && target.player ? (
          target.direct ? (
            <video
              src={target.player}
              poster={poster || undefined}
              controls
              autoPlay
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
              onError={() => setLoadedSource(null)}
            />
          ) : (
            <iframe
              src={
                target.player +
                (["youtube", "vimeo"].includes(target.provider)
                  ? `${target.player.includes("?") ? "&" : "?"}autoplay=1`
                  : "")
              }
              title={title}
              loading="lazy"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              className="h-full w-full border-0"
              onError={() => setLoadedSource(null)}
            />
          )
        ) : (
          <button
            type="button"
            disabled={!target.player}
            onClick={() => setLoadedSource(src)}
            className="text-waambat-pink relative flex h-full w-full items-center justify-center border border-white/20"
            aria-label={`Play ${title}`}
          >
            {poster ? (
              <SourceImage
                src={poster}
                alt=""
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : target.provider === "youtube" ? (
              // eslint-disable-next-line @next/next/no-img-element -- Official thumbnail, requested by the browser only.
              <img
                src={`https://i.ytimg.com/vi/${target.player.split("/").at(-1)}/hqdefault.jpg`}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : null}
            <span className="relative bg-black/80 px-4 py-2">
              {target.player ? `▶ ${title}` : title}
            </span>
          </button>
        )}
      </div>
      {!compact && (
        <figcaption className="mt-3 text-sm">
          {loaded && (
            <button
              type="button"
              onClick={() => setLoadedSource(null)}
              className="mr-4 underline"
            >
              Close player
            </button>
          )}
          <a
            href={target.original}
            target="_blank"
            rel="noopener noreferrer"
            className="text-waambat-link"
          >
            Open original source ↗
          </a>
          <p className="text-xs text-white/60">
            Loading a player contacts {target.provider}. If access is restricted
            or unavailable, use the original link.
          </p>
        </figcaption>
      )}
    </figure>
  );
}
