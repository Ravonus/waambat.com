"use client";
import { useEffect, useRef, useState } from "react";
import type { Artwork } from "~/lib/content";
import { videoSource } from "~/lib/video-source";
import {
  DEFAULT_LIVE_SETTLE_MS,
  LIVE_SETTLE_MS,
  opensLive,
} from "~/lib/ordinal-sources";
import { useViewportPlayback } from "./useViewportPlayback";
import { PlaybackButton } from "./MediaControls";
import SourceImage from "./SourceImage";
import styles from "./OrdinalPiece.module.css";

// One live Ordinals artwork. Its cached loop is on screen at once (a same-origin file the CDN keeps
// forever), and the inscription itself opens on request: opening it mounts the live player over the
// loop and fades it in when it has loaded. The live document is kept, never reloaded, once opened,
// because these opaque inscriptions have no verified pause protocol; "Back to preview" is the
// visitor's own choice to drop it. The page never scrolls into a trapped iframe: the live piece takes
// the pointer only while "Interact" is on (Escape or moving focus away turns it off).
export default function OrdinalPiece({
  artwork,
  priority = false,
}: {
  artwork: Artwork;
  priority?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const interact = useRef<HTMLButtonElement>(null);
  const [live, setLive] = useState(false);
  const [shown, setShown] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const source = videoSource(artwork.videoSrc);
  const player = source?.provider === "ordinals" ? source.player : "";
  const loop = artwork.previewSrc;
  // LUX is the interactive piece; the videos are their loops. See opensLive.
  const canOpen = opensLive(player, !!loop);
  const lifecycle = useViewportPlayback(container, !loop || shown, (wanted) => {
    if (!wanted) video.current?.pause();
    else if (video.current?.readyState)
      void video.current.play().catch(() => setPlaying(false));
  });
  const { wanted } = lifecycle;
  useEffect(() => {
    const element = video.current;
    if (wanted && !error) void element?.play().catch(() => setPlaying(false));
    else element?.pause();
    return () => element?.pause();
  }, [wanted, error]);
  useEffect(() => {
    // The first pieces fetch their whole loop as soon as the page is interactive, unless the visitor
    // asked to save data; their posters are already on screen from the server render.
    const saving = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection?.saveData;
    if (priority && !saving && video.current) video.current.preload = "auto";
  }, [priority]);
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
  const open = () => {
    setLive(true);
    setInteracting(true);
  };
  useEffect(() => () => clearTimeout(settle.current), []);
  const close = () => {
    clearTimeout(settle.current);
    setLive(false);
    setShown(false);
    setInteracting(false);
  };
  const toggle = () => {
    if (playing) lifecycle.pause();
    else {
      setError(false);
      lifecycle.play();
    }
  };
  return (
    <div>
      <div
        ref={container}
        className={styles.stage}
        style={{ aspectRatio: artwork.aspectRatio ?? 1 }}
        data-ordinal-player={artwork.id}
        data-live={live ? (shown ? "shown" : "loading") : "off"}
        data-interacting={interacting}
      >
        {loop && !error ? (
          <video
            ref={video}
            src={loop}
            poster={artwork.poster || undefined}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={
              canOpen ? `${artwork.title}, preview loop` : artwork.title
            }
            onPlay={() => {
              if (!lifecycle.desired.current) video.current?.pause();
              setPlaying(lifecycle.desired.current);
            }}
            onPause={() => setPlaying(false)}
            onLoadedData={() => {
              if (lifecycle.desired.current)
                void video.current?.play().catch(() => setPlaying(false));
            }}
            onError={() => {
              setError(true);
              setPlaying(false);
            }}
            className={styles.layer}
          />
        ) : artwork.poster ? (
          <SourceImage
            src={artwork.poster}
            alt={`${artwork.title}, preview`}
            eager={priority}
            sizes="(max-width: 767px) calc(100vw - 40px), 400px"
            className={styles.layer}
          />
        ) : (
          <div className={styles.name} aria-hidden="true">
            {artwork.title}
          </div>
        )}
        {live && player && (
          <iframe
            id={`ordinal-frame-${artwork.id}`}
            src={player}
            title={artwork.title}
            allow="autoplay; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation"
            onLoad={() => {
              // Keep the loop up until the piece has drawn something worth showing.
              clearTimeout(settle.current);
              settle.current = setTimeout(
                () => setShown(true),
                LIVE_SETTLE_MS[player] ?? DEFAULT_LIVE_SETTLE_MS,
              );
            }}
            tabIndex={interacting ? undefined : -1}
            className={`${styles.layer} ${styles.live}`}
            style={{
              pointerEvents: interacting && shown ? "auto" : "none",
            }}
          />
        )}
        {live && !shown && (
          <p role="status" className={styles.status}>
            Opening the live piece…
          </p>
        )}
      </div>
      <div className={styles.controls}>
        {live && player ? (
          <>
            <button
              ref={interact}
              type="button"
              aria-pressed={interacting}
              aria-controls={`ordinal-frame-${artwork.id}`}
              onClick={() => setInteracting((value) => !value)}
              className={`ordinal-gate ${styles.action}`}
            >
              {interacting ? "Exit interaction" : "Interact"}
            </button>
            <button
              type="button"
              onClick={close}
              className={`ordinal-close ${styles.action}`}
            >
              Back to preview
            </button>
          </>
        ) : (
          <>
            {loop && !error && (
              <PlaybackButton
                playing={playing}
                title={`${artwork.title} preview`}
                onClick={toggle}
              />
            )}
            {canOpen && (
              <button
                type="button"
                onClick={open}
                aria-label={`Interact live with ${artwork.title}`}
                className={`ordinal-open ${styles.action}`}
              >
                Interact live
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
