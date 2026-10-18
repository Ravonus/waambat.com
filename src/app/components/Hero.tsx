"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Artwork, Content } from "~/lib/content";
import { PlaybackButton } from "./MediaControls";
import { useViewportPlayback } from "./useViewportPlayback";
import styles from "./Hero.module.css";

// The portrait composition is for phones held upright. A phone on its side has
// the width of a small tablet but the shape of the landscape banner.
const PORTRAIT_PHONE = "(max-width: 767px) and (orientation: portrait)";

// The home banner: a silent montage of her own works with the live wordmark in its quiet column.
// When the banner has an ending loop it plays once, ends on its last shot, and that shot carries on
// as a second, seamlessly looping video: the montage never replays. Without one the whole video
// repeats. Content (media, poster, titles, logo) comes from an ordinary section/artwork so the
// studio edits it like everything else.
export default function Hero({
  section,
  item,
  preview = false,
}: {
  section: Content["sections"][number];
  item: Artwork;
  preview?: boolean;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const endless = useRef<HTMLVideoElement>(null);
  const [mobile, setMobile] = useState(false);
  const [sourceReady, setSourceReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [shown, setShown] = useState(false);
  const [error, setError] = useState(false);
  // "intro" is the video that plays once; "loop" is the ending that repeats.
  const [phase, setPhase] = useState<"intro" | "loop">("intro");
  const [loopWanted, setLoopWanted] = useState(false);
  const [loopShown, setLoopShown] = useState(false);
  const activeVideo = () =>
    phaseRef.current === "loop" ? endless.current : video.current;
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const lifecycle = useViewportPlayback(frame, false, (wanted) => {
    const element = activeVideo();
    if (!wanted) element?.pause();
    else if (element?.readyState)
      void element.play().catch(() => setPlaying(false));
  });
  const { requested, wanted } = lifecycle;
  useEffect(() => {
    const query = matchMedia(PORTRAIT_PHONE);
    const update = () => {
      setMobile(query.matches);
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
    const element = phase === "loop" ? endless.current : video.current;
    if (wanted && !error) void element?.play().catch(() => setPlaying(false));
    else element?.pause();
    return () => element?.pause();
  }, [wanted, requested, error, phase, sourceReady, mobile]);
  const portrait = mobile && !!item.mobileVideoSrc;
  const source = portrait ? item.mobileVideoSrc : item.videoSrc;
  // The ending loop follows the video it was rendered with (portrait with portrait).
  const loopSource = portrait ? item.mobileLoopSrc : item.loopSrc;
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
        {playable && requested && sourceReady && !error && (
          <video
            ref={video}
            src={source}
            poster={
              mobile && item.mobilePoster ? item.mobilePoster : item.poster
            }
            muted
            loop={!loopSource}
            playsInline
            preload="auto"
            aria-label={item.title}
            data-shown={shown}
            data-done={loopShown}
            className={styles.video}
            onLoadedData={() => {
              if (lifecycle.desired.current && phaseRef.current === "intro")
                void video.current?.play().catch(() => setPlaying(false));
            }}
            onPlaying={() => setShown(true)}
            onPlay={() => {
              if (!lifecycle.desired.current) video.current?.pause();
              else if (phaseRef.current === "intro")
                setPlaying(lifecycle.desired.current);
            }}
            onPause={(event) => {
              // Reaching the end pauses the video; that is not the visitor pausing the banner.
              if (!event.currentTarget.ended) setPlaying(false);
            }}
            onTimeUpdate={(event) => {
              // Start fetching the ending loop well before it is needed, so the hand-over has nothing to wait for.
              const element = event.currentTarget;
              if (
                loopSource &&
                !loopWanted &&
                element.duration - element.currentTime < 8
              )
                setLoopWanted(true);
            }}
            onEnded={() => {
              if (!loopSource) return;
              setLoopWanted(true);
              setPhase("loop");
            }}
            onError={() => {
              setError(true);
              setPlaying(false);
              setShown(false);
            }}
          />
        )}
        {playable && requested && sourceReady && !error && loopSource && (
          <video
            ref={endless}
            src={loopWanted ? loopSource : undefined}
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            tabIndex={-1}
            data-shown={loopShown}
            className={styles.video}
            onCanPlay={() => {
              if (phaseRef.current === "loop" && lifecycle.desired.current)
                void endless.current?.play().catch(() => setPlaying(false));
            }}
            onPlaying={() => {
              // The loop's first frame is the frame after the video's last, so the swap is not visible.
              setLoopShown(true);
              setPlaying(true);
            }}
            onPlay={() => {
              if (!lifecycle.desired.current) endless.current?.pause();
            }}
            onPause={() => {
              if (phaseRef.current === "loop") setPlaying(false);
            }}
            onError={() => {
              // The ending stays on the last frame of the video, which is the artwork's final shot.
              setPlaying(false);
            }}
          />
        )}
        {/* The wordmark leads home, like the header wordmark it stands in for. */}
        <h1
          className={`${styles.wordmark} ${item.logoSrc ? "" : "font-brand text-waambat-logo"}`}
        >
          <Link
            href={preview ? "/admin/preview?page=nfts" : "/"}
            onNavigate={() => {
              if (!preview) window.dispatchEvent(new Event("waambat:navigate"));
            }}
            aria-label={`${section.title} home`}
            className={styles.wordmarkLink}
          >
            {item.logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- Artist-supplied logo of unknown size and format.
              <img src={item.logoSrc} alt="" />
            ) : (
              section.title
            )}
          </Link>
        </h1>
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
