"use client";
import { useEffect, useRef, useState } from "react";
import type { Artwork, Content } from "~/lib/content";
import { PlaybackButton } from "./MediaControls";
import { useViewportPlayback } from "./useViewportPlayback";
import styles from "./Hero.module.css";

// The portrait composition is for phones held upright. A phone on its side has
// the width of a small tablet but the shape of the landscape banner.
const PORTRAIT_PHONE = "(max-width: 767px) and (orientation: portrait)";

// The home banner: a silent, looping montage of her own works with the live
// wordmark in its quiet column. Content (media, poster, titles, logo) comes
// from an ordinary section/artwork so the studio edits it like everything else.
export default function Hero({
  section,
  item,
}: {
  section: Content["sections"][number];
  item: Artwork;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [mobile, setMobile] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [shown, setShown] = useState(false);
  const [error, setError] = useState(false);
  const lifecycle = useViewportPlayback(frame, false, (wanted) => {
    if (!wanted) video.current?.pause();
    else if (video.current?.readyState)
      void video.current.play().catch(() => setPlaying(false));
  });
  const { requested, wanted } = lifecycle;
  useEffect(() => {
    const query = matchMedia(PORTRAIT_PHONE);
    const update = () => setMobile(query.matches);
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
    return () => element?.pause();
  }, [wanted, requested, error]);
  const source =
    mobile && item.mobileVideoSrc ? item.mobileVideoSrc : item.videoSrc;
  // A poster-only banner is a legitimate choice; it just has nothing to play.
  const playable = !!source;
  const ratio = item.aspectRatio ?? 16 / 9;
  const mobileRatio = item.mobileAspectRatio ?? ratio;
  const toggle = () => {
    if (playing) lifecycle.pause();
    else {
      setError(false);
      lifecycle.play();
    }
  };
  return (
    <section
      aria-label={section.title}
      className={styles.hero}
      data-hero
      data-playback-state={
        error
          ? "unavailable"
          : playing
            ? "playing"
            : requested
              ? "paused"
              : "idle"
      }
      style={
        {
          "--hero-ratio": ratio,
          "--hero-ratio-mobile": mobileRatio,
        } as React.CSSProperties
      }
    >
      <div ref={frame} className={styles.frame}>
        <picture>
          {item.mobilePoster && (
            <source media={PORTRAIT_PHONE} srcSet={item.mobilePoster} />
          )}
          {/* The still is the first frame of the video, so playback begins without a visible change. */}
          <img
            src={item.poster}
            alt={item.title}
            fetchPriority="high"
            decoding="async"
            className={styles.poster}
          />
        </picture>
        {playable && requested && !error && (
          <video
            ref={video}
            src={source}
            poster={
              mobile && item.mobilePoster ? item.mobilePoster : item.poster
            }
            muted
            loop
            playsInline
            preload="auto"
            aria-label={item.title}
            data-shown={shown}
            className={styles.video}
            onLoadedData={() => {
              if (lifecycle.desired.current)
                void video.current?.play().catch(() => setPlaying(false));
            }}
            onPlaying={() => setShown(true)}
            onPlay={() => {
              if (!lifecycle.desired.current) video.current?.pause();
              setPlaying(lifecycle.desired.current);
            }}
            onPause={() => setPlaying(false)}
            onError={() => {
              setError(true);
              setPlaying(false);
              setShown(false);
            }}
          />
        )}
        {item.logoSrc ? (
          <h1 className={styles.wordmark}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Artist-supplied logo of unknown size and format. */}
            <img src={item.logoSrc} alt={section.title} />
          </h1>
        ) : (
          <h1 className={`${styles.wordmark} font-brand text-waambat-logo`}>
            {section.title}
          </h1>
        )}
        {playable && (
          <div className={styles.controls}>
            <PlaybackButton
              playing={playing}
              title={item.title}
              onClick={toggle}
              error={error}
            />
            {error && (
              <p role="status" className={styles.status}>
                Video could not load. The still above is the artwork.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
