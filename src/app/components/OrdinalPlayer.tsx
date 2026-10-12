"use client";
import { useRef } from "react";
import type { Artwork } from "~/lib/content";
import { videoSource } from "~/lib/video-source";
import { useViewportPlayback } from "./useViewportPlayback";
import ArtworkCard from "./ArtworkCard";
import VideoEmbed from "./VideoEmbed";
import SourceImage from "./SourceImage";
import { PlaybackButton } from "./MediaControls";
export default function OrdinalPlayer({ artwork }: { artwork: Artwork }) {
  const container = useRef<HTMLDivElement>(null);
  const source = videoSource(artwork.videoSrc);
  const lifecycle = useViewportPlayback(
    container,
    source?.provider !== "ordinals",
  );
  if (source?.direct)
    return (
      <ArtworkCard
        artwork={artwork}
        ratio={artwork.aspectRatio ?? 1}
        showCaption={false}
      />
    );
  if (source?.provider !== "ordinals")
    return (
      <VideoEmbed
        src={artwork.videoSrc}
        title={artwork.title}
        poster={artwork.poster}
        ratio={artwork.aspectRatio}
        compact
      />
    );
  return (
    <div
      ref={container}
      className="relative w-full bg-black"
      style={{ aspectRatio: artwork.aspectRatio ?? 1 }}
      data-ordinal-player={artwork.id}
    >
      {lifecycle.wanted ? (
        <iframe
          src={source.player}
          title={artwork.title}
          allow="autoplay; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : artwork.poster ? (
        <SourceImage
          src={artwork.poster}
          alt={artwork.title}
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <div
          className="text-waambat-pink absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
        >
          {artwork.title}
        </div>
      )}
      <div className="absolute right-3 bottom-3">
        <PlaybackButton
          playing={lifecycle.wanted}
          title={artwork.title}
          onClick={() =>
            lifecycle.wanted ? lifecycle.pause() : lifecycle.play()
          }
        />
      </div>
    </div>
  );
}
