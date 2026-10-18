"use client";
import { useEffect, useRef, useState } from "react";
import type { Artwork } from "~/lib/content";
import InstagramCard from "./InstagramCard";
import VideoEmbed from "./VideoEmbed";
import { useViewportPlayback } from "./useViewportPlayback";
import { PlaybackButton, MediaIcon } from "./MediaControls";
import { newTabProps } from "~/lib/new-tab";
import { useAdaptiveVideo } from "./useAdaptiveVideo";
import { adaptivePoster, adaptivePreview } from "~/lib/adaptive-media";
import { paintingPoster } from "~/lib/painting-source";
export type { Artwork } from "~/lib/content";
function Poster({
  artwork,
  priority,
}: {
  artwork: Artwork;
  priority: boolean;
}) {
  const still = artwork.poster || adaptivePreview(artwork.videoSrc)?.poster;
  if (!still) return null;
  const source = adaptivePoster(still);
  const poster = paintingPoster(source);
  // Original animated GIFs remain untouched; local paintings have responsive stills.
  return (
    <picture className="block h-full w-full">
      {poster.avif && (
        <source
          type="image/avif"
          srcSet={poster.avif}
          sizes="(max-width: 767px) calc(100vw - 40px), 960px"
        />
      )}
      <img
        src={source}
        srcSet={poster.srcSet}
        sizes="(max-width: 767px) calc(100vw - 40px), 960px"
        alt={artwork.title}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        width={poster.local ? 960 : undefined}
        height={poster.local ? 960 : undefined}
        decoding="async"
        className="h-full w-full object-contain"
      />
    </picture>
  );
}
export default function ArtworkCard({
  artwork,
  showCaption = true,
  aspect = "square",
  ratio,
  originalFlow = false,
  trailer = false,
  naturalAspect = false,
  priority = false,
}: {
  artwork: Artwork;
  showCaption?: boolean;
  aspect?: "square" | "portrait";
  ratio?: number;
  originalFlow?: boolean;
  trailer?: boolean;
  naturalAspect?: boolean;
  priority?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const lifecycle = useViewportPlayback(
    container,
    artwork.kind !== "video",
    (wanted) => {
      if (!wanted) video.current?.pause();
      else if (video.current?.readyState)
        void video.current.play().catch(() => setPlaying(false));
    },
    0.5,
  );
  const { requested, wanted } = lifecycle;
  const [mobile, setMobile] = useState(false);
  const [sourceReady, setSourceReady] = useState(false);
  const [shownSource, setShownSource] = useState("");
  const [error, setError] = useState(false);
  const [intrinsic, setIntrinsic] = useState<{
    src: string;
    ratio: number;
  } | null>(null);
  const [muted, setMuted] = useState(true);
  const selectedSource =
    mobile && artwork.mobileVideoSrc
      ? artwork.mobileVideoSrc
      : artwork.previewSrc || artwork.videoSrc;
  useAdaptiveVideo(
    video,
    requested && sourceReady && !error ? selectedSource : undefined,
    wanted,
  );
  const mediaRatio =
    ratio ??
    (naturalAspect ? adaptivePreview(artwork.videoSrc)?.ratio : undefined) ??
    (naturalAspect && intrinsic?.src === selectedSource
      ? intrinsic.ratio
      : undefined);
  useEffect(() => {
    const query = matchMedia("(max-width: 767px)");
    const update = () => {
      setMobile(
        query.matches ||
          !!(navigator as Navigator & { connection?: { saveData?: boolean } })
            .connection?.saveData,
      );
      setSourceReady(true);
    };
    const initial = requestAnimationFrame(update);
    query.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(initial);
      query.removeEventListener("change", update);
    };
  }, []);
  useEffect(() => {
    const element = video.current;
    if (wanted && !error) void element?.play().catch(() => setPlaying(false));
    else element?.pause();
    return () => {
      element?.pause();
    };
  }, [wanted, requested, error, sourceReady, selectedSource]);
  const toggle = () => {
    if (playing) lifecycle.pause();
    else {
      setError(false);
      lifecycle.play();
    }
  };
  if (artwork.kind === "embed")
    return (
      <article data-artwork={artwork.id} className="mb-10 text-center">
        <h2 className="text-waambat-pink text-[22px]">{artwork.title}</h2>
        <VideoEmbed
          src={artwork.videoSrc}
          title={artwork.title}
          poster={artwork.poster}
          ratio={ratio}
        />
        <p>{artwork.description}</p>
        <a href={artwork.tokenLink} {...newTabProps(artwork.tokenLink)}>
          View collection ↗
        </a>
      </article>
    );
  if (artwork.kind === "instagram") return <InstagramCard artwork={artwork} />;
  return (
    <article
      data-artwork={artwork.id}
      data-playback-state={
        error
          ? "unavailable"
          : playing
            ? "playing"
            : requested
              ? "paused"
              : "idle"
      }
      className={
        originalFlow ? "original-artwork text-center" : "mb-10 text-center"
      }
      style={
        originalFlow
          ? ({
              "--artwork-gap": `${artwork.precedingGap ?? 200}px`,
            } as React.CSSProperties)
          : undefined
      }
    >
      {artwork.kind !== "link" && (
        <div
          ref={container}
          style={
            mediaRatio
              ? { aspectRatio: mediaRatio }
              : naturalAspect
                ? { height: 150 }
                : undefined
          }
          className={`artwork-media relative w-full bg-black ${naturalAspect ? "" : aspect === "portrait" ? "aspect-[4/5]" : "aspect-square"}`}
        >
          <a
            href={trailer ? undefined : artwork.tokenLink}
            {...newTabProps(trailer ? undefined : artwork.tokenLink)}
            aria-label={`Open ${artwork.title} original ${artwork.kind === "image" ? "inscription" : "token"} page`}
            className="relative block h-full w-full"
          >
            <Poster artwork={artwork} priority={priority} />
            {artwork.kind === "video" && requested && sourceReady && !error && (
              <video
                key={selectedSource}
                ref={video}
                muted={muted}
                loop={!trailer}
                controls={trailer}
                playsInline
                preload="none"
                onLoadedMetadata={(event) => {
                  const element = event.currentTarget;
                  if (
                    naturalAspect &&
                    element.videoWidth &&
                    element.videoHeight
                  )
                    setIntrinsic({
                      src: selectedSource,
                      ratio: element.videoWidth / element.videoHeight,
                    });
                }}
                onLoadedData={() => {
                  if (lifecycle.desired.current)
                    void video.current?.play().catch(() => setPlaying(false));
                }}
                onPlay={() => {
                  if (!lifecycle.desired.current) video.current?.pause();
                  setPlaying(lifecycle.desired.current);
                }}
                onPause={() => setPlaying(false)}
                onPlaying={() => setShownSource(selectedSource)}
                onError={(event) => {
                  if (!event.currentTarget.error) return;
                  setError(true);
                  setPlaying(false);
                  setShownSource("");
                }}
                className="absolute inset-0 h-full w-full object-contain"
                style={{ opacity: shownSource === selectedSource ? 1 : 0 }}
              />
            )}
          </a>
          {artwork.kind === "video" && !trailer && (
            <div className="painting-controls">
              <PlaybackButton
                playing={playing}
                title={artwork.title}
                onClick={toggle}
                error={error}
              />
            </div>
          )}
          {error && (
            <div
              role="status"
              className="absolute inset-x-2 bottom-14 text-sm text-white"
            >
              <p>Video could not load.</p>
              <a
                href={artwork.videoSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center underline"
              >
                Open original video ↗
              </a>
            </div>
          )}
          {artwork.kind === "video" && trailer && (
            <div className="absolute top-3 right-3 flex gap-2">
              <PlaybackButton
                playing={playing}
                title={artwork.title}
                onClick={toggle}
                error={error}
              />
              <button
                type="button"
                onClick={() => setMuted(!muted)}
                aria-pressed={!muted}
                className="media-control"
                aria-label={
                  muted ? "Enable trailer audio" : "Mute trailer audio"
                }
              >
                <MediaIcon kind={muted ? "muted" : "volume"} />
              </button>
            </div>
          )}
        </div>
      )}
      {showCaption && (
        <div className="artwork-caption">
          <h2 className="text-waambat-pink mt-5 text-[26px] leading-snug">
            <a
              href={trailer ? undefined : artwork.tokenLink}
              {...newTabProps(trailer ? undefined : artwork.tokenLink)}
            >
              {artwork.title}
            </a>
          </h2>
          {artwork.year && <p className="mt-2">{artwork.year}</p>}
          {(artwork.captionLines ?? [artwork.description]).map(
            (line, index) => (
              <p key={index} className="mt-1 whitespace-pre-line">
                {line}
              </p>
            ),
          )}
        </div>
      )}
      {artwork.kind === "link" && (
        <a
          href={artwork.tokenLink}
          {...newTabProps(artwork.tokenLink)}
          className="text-waambat-link mt-3 inline-block"
        >
          {artwork.title.includes("Paper")
            ? "Read the Pink Paper"
            : "View collection"}{" "}
          ↗
        </a>
      )}
    </article>
  );
}
