"use client";
import { useEffect, useRef, useState } from "react";
import type { Artwork } from "~/lib/content";
import InstagramCard from "./InstagramCard";
import VideoEmbed from "./VideoEmbed";
export type { Artwork } from "~/lib/content";
function Poster({ artwork }: { artwork: Artwork }) {
  const local = /^\/posters\/\d+-960.webp$/.test(artwork.poster);
  // Original animated GIFs remain untouched; local paintings have responsive stills.
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Pre-generated responsive stills and original GIFs avoid a server image proxy.
    <img
      src={artwork.poster}
      srcSet={
        local
          ? `${artwork.poster.replace("-960", "-480")} 480w, ${artwork.poster} 960w`
          : undefined
      }
      sizes="(max-width: 767px) calc(100vw - 40px), 460px"
      alt={artwork.title}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-contain"
    />
  );
}
export default function ArtworkCard({ artwork }: { artwork: Artwork }) {
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [requested, setRequested] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const visible = useRef(false);
  const manual = useRef(false);
  const blocked = useRef(false);
  useEffect(() => {
    const element = container.current;
    if (!element || artwork.kind !== "video") return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    blocked.current = motion.matches || !!connection?.saveData;
    setMobile(
      matchMedia("(max-width: 767px)").matches || !!connection?.saveData,
    );
    const sync = () => {
      const shouldPlay =
        visible.current &&
        !document.hidden &&
        (!blocked.current || manual.current);
      if (shouldPlay) {
        setRequested(true);
        if (video.current?.readyState)
          void video.current.play().catch(() => setPlaying(false));
      } else {
        video.current?.pause();
        setPlaying(false);
      }
    };
    const onMotion = () => {
      blocked.current = motion.matches || !!connection?.saveData;
      manual.current = false;
      sync();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        visible.current = !!entries[0]?.isIntersecting;
        sync();
      },
      { threshold: 0.1 },
    );
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", onMotion);
    const currentVideo = video.current;
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", onMotion);
      currentVideo?.pause();
    };
  }, [artwork.id, artwork.kind]);
  useEffect(() => {
    if (
      requested &&
      !error &&
      visible.current &&
      !document.hidden &&
      (!blocked.current || manual.current)
    )
      void video.current?.play().catch(() => setPlaying(false));
  }, [requested, error]);
  const toggle = () => {
    if (playing) {
      manual.current = false;
      blocked.current = true;
      video.current?.pause();
      setPlaying(false);
    } else {
      manual.current = true;
      setError(false);
      setRequested(true);
      void video.current?.play().catch(() => setPlaying(false));
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
        />
        <p>{artwork.description}</p>
        <a href={artwork.tokenLink}>View collection ↗</a>
      </article>
    );
  if (artwork.kind === "instagram") return <InstagramCard artwork={artwork} />;
  return (
    <article data-artwork={artwork.id} className="mb-10 text-center">
      {artwork.kind !== "link" && (
        <div ref={container} className="relative aspect-square w-full bg-black">
          <a
            href={artwork.tokenLink}
            aria-label={`Open ${artwork.title} original ${artwork.kind === "image" ? "inscription" : "token"} page`}
            className="block h-full w-full"
          >
            {artwork.kind === "image" || !requested || error ? (
              <Poster artwork={artwork} />
            ) : (
              <video
                ref={video}
                src={
                  mobile && artwork.mobileVideoSrc
                    ? artwork.mobileVideoSrc
                    : artwork.videoSrc
                }
                poster={
                  mobile && /^\/posters\/\d+-960.webp$/.test(artwork.poster)
                    ? artwork.poster.replace("-960", "-480")
                    : artwork.poster
                }
                muted
                loop
                playsInline
                preload="none"
                onLoadedData={() => {
                  if (
                    visible.current &&
                    !document.hidden &&
                    (!blocked.current || manual.current)
                  )
                    void video.current?.play().catch(() => setPlaying(false));
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onError={() => {
                  setError(true);
                  setPlaying(false);
                }}
                className="h-full w-full object-contain"
              />
            )}
          </a>
          {artwork.kind === "video" && (
            <button
              type="button"
              onClick={toggle}
              className="absolute right-3 bottom-3 rounded bg-black/80 px-3 py-1 text-xs text-white"
              aria-label={`${playing ? "Pause" : "Play"} ${artwork.title}`}
            >
              {error ? "Retry playback" : playing ? "Pause" : "Play"}
            </button>
          )}
        </div>
      )}
      <h2 className="text-waambat-pink mt-5 text-[27px] leading-snug">
        <a href={artwork.tokenLink}>{artwork.title}</a>
      </h2>
      {artwork.year && <p className="mt-2">{artwork.year}</p>}
      <p className="mt-1 whitespace-pre-line">{artwork.description}</p>
      {artwork.kind === "link" && (
        <a
          href={artwork.tokenLink}
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
