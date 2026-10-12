"use client";
import { useEffect, useRef, useState } from "react";
import type { Artwork } from "~/lib/content";
import { videoSource } from "~/lib/video-source";
import { useViewportPlayback } from "./useViewportPlayback";
import ArtworkCard from "./ArtworkCard";
import VideoEmbed from "./VideoEmbed";
import SourceImage from "./SourceImage";
import { PlaybackButton } from "./MediaControls";
export default function OrdinalPlayer({ artwork }: { artwork: Artwork }) {
  const container = useRef<HTMLDivElement>(null);
  const interact = useRef<HTMLButtonElement>(null);
  const [interacting, setInteracting] = useState(false);
  const gated = artwork.id === "lux-ok-algo";
  const source = videoSource(artwork.videoSrc);
  const lifecycle = useViewportPlayback(
    container,
    source?.provider !== "ordinals",
    (wanted) => {
      if (!wanted) setInteracting(false);
    },
  );
  useEffect(() => {
    if (!interacting) return;
    const exit = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setInteracting(false);
      if (!document.querySelector("dialog[open]"))
        interact.current?.focus({ preventScroll: true });
    };
    const blur = () => {
      // Focusing the intentional cross-origin interaction is expected.
      if (
        document.activeElement?.tagName !== "IFRAME" ||
        !container.current?.contains(document.activeElement)
      )
        setInteracting(false);
    };
    document.addEventListener("keydown", exit);
    window.addEventListener("blur", blur);
    return () => {
      document.removeEventListener("keydown", exit);
      window.removeEventListener("blur", blur);
    };
  }, [interacting]);
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
      data-interacting={gated ? interacting : undefined}
    >
      {gated && lifecycle.requested && (
        <button
          ref={interact}
          type="button"
          aria-pressed={interacting}
          aria-controls={`ordinal-frame-${artwork.id}`}
          onClick={() => setInteracting((value) => !value)}
          className="ordinal-gate text-waambat-pink absolute top-3 right-3 z-10 min-h-11 rounded border border-white/30 bg-black/80 px-3 py-2"
        >
          {interacting ? "Exit interaction" : "Interact"}
        </button>
      )}
      {/* These opaque inscriptions have no verified pause protocol. Keep the
          activated document/state; visibility is never a reload substitute. */}
      {lifecycle.requested ? (
        <iframe
          id={`ordinal-frame-${artwork.id}`}
          src={source.player}
          title={artwork.title}
          allow="autoplay; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          className="absolute inset-0 h-full w-full border-0"
          tabIndex={gated && !interacting ? -1 : undefined}
          style={
            gated ? { pointerEvents: interacting ? "auto" : "none" } : undefined
          }
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
      {!lifecycle.requested && (
        <div className="absolute right-3 bottom-3">
          <PlaybackButton
            playing={false}
            title={artwork.title}
            onClick={() => lifecycle.play()}
          />
        </div>
      )}
    </div>
  );
}
