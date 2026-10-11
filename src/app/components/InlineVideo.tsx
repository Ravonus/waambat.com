"use client";
import { useEffect, useRef, useState } from "react";
import { videoSource } from "~/lib/video-source";
import { youtubeAPI } from "~/lib/youtube-api";
import { useViewportPlayback } from "./useViewportPlayback";
import { PlaybackButton } from "./MediaControls";
import SourceImage from "./SourceImage";
type Controls = {
  play: () => void;
  pause: () => void;
  currentTime: () => number | Promise<number>;
};
export default function InlineVideo({
  src,
  poster,
  title,
  suspended = false,
}: {
  src: string;
  poster: string;
  title: string;
  suspended?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const native = useRef<HTMLVideoElement>(null);
  const controls = useRef<Controls | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const lifecycle = useViewportPlayback(container, suspended, (wanted) => {
    if (wanted) controls.current?.play();
    else controls.current?.pause();
  });
  const target = videoSource(src);
  const provider = target?.provider;
  const source = target?.player;
  const direct = target?.direct;
  // Read-only, on-demand browser QA. No timer, media polling or control API is
  // exposed. The sample comes from the provider SDK, rather than UI state.
  useEffect(() => {
    const element = container.current;
    const inspect = (event: Event) => {
      const receive = (event as CustomEvent<(time: number | null) => void>)
        .detail;
      if (typeof receive !== "function") return;
      void Promise.resolve()
        .then(() => controls.current?.currentTime() ?? null)
        .then(receive)
        .catch(() => receive(null));
    };
    element?.addEventListener("waambat:inspect-playback", inspect);
    return () =>
      element?.removeEventListener("waambat:inspect-playback", inspect);
  }, []);
  useEffect(() => {
    if (!lifecycle.requested || !source || direct) return;
    const element = frame.current;
    if (!element) return;
    let cancelled = false;
    let destroy: (() => void) | undefined;
    const fail = () => {
      if (!cancelled) {
        controls.current?.pause();
        controls.current = null;
        cancelled = true;
        setError(true);
        setPlaying(false);
      }
    };
    if (provider === "youtube") {
      void youtubeAPI()
        .then((api) => {
          if (cancelled) return;
          const player = new api.Player(element, {
            events: {
              onReady: () => {
                if (cancelled) return;
                player.mute();
                controls.current = {
                  play: () => player.playVideo(),
                  pause: () => player.pauseVideo(),
                  currentTime: () => player.getCurrentTime(),
                };
                if (lifecycle.desired.current) player.playVideo();
                else player.pauseVideo();
              },
              onStateChange: (event) => {
                if (cancelled) return;
                const running = event.data === api.PlayerState.PLAYING;
                if (running && !lifecycle.desired.current) player.pauseVideo();
                setPlaying(running && lifecycle.desired.current);
                if (
                  event.data === api.PlayerState.ENDED &&
                  lifecycle.desired.current
                )
                  player.playVideo();
              },
              onError: fail,
              onAutoplayBlocked: () => {
                if (!cancelled) setPlaying(false);
              },
            },
          });
          destroy = () => player.destroy();
        })
        .catch(fail);
    } else if (provider === "vimeo") {
      void import("@vimeo/player")
        .then(({ default: Player }) => {
          if (cancelled) return;
          const player = new Player(element);
          const pause = () => {
            void player.pause().catch(() => {});
          };
          const play = () => {
            void player.play().catch(() => {
              if (!cancelled) setPlaying(false);
            });
          };
          player.on("play", () => {
            if (cancelled) return;
            if (!lifecycle.desired.current) pause();
            setPlaying(lifecycle.desired.current);
          });
          player.on("pause", () => {
            if (!cancelled) setPlaying(false);
          });
          player.on("error", fail);
          void player
            .ready()
            .then(async () => {
              if (cancelled) return;
              await player.setMuted(true);
              if (cancelled) return;
              controls.current = {
                play,
                pause,
                currentTime: () => player.getCurrentTime(),
              };
              if (lifecycle.desired.current) play();
              else pause();
            })
            .catch(fail);
          destroy = () => {
            void player.destroy().catch(() => {});
          };
        })
        .catch(fail);
    }
    return () => {
      cancelled = true;
      controls.current?.pause();
      controls.current = null;
      destroy?.();
    };
  }, [lifecycle.requested, lifecycle.desired, source, provider, direct]);
  useEffect(() => {
    if (!direct || !lifecycle.requested) return;
    const element = native.current;
    controls.current = {
      play: () => {
        void element?.play().catch(() => setPlaying(false));
      },
      pause: () => element?.pause(),
      currentTime: () => element?.currentTime ?? 0,
    };
    if (lifecycle.wanted) controls.current.play();
    else controls.current.pause();
    return () => {
      element?.pause();
      controls.current = null;
    };
  }, [direct, lifecycle.requested, lifecycle.wanted]);
  let playerURL = source ?? "";
  if (source && !direct && typeof window !== "undefined") {
    const url = new URL(source);
    url.searchParams.set("autoplay", "0");
    if (provider === "youtube") {
      url.searchParams.set("enablejsapi", "1");
      url.searchParams.set("origin", location.origin);
      url.searchParams.set("playsinline", "1");
      url.searchParams.set("mute", "1");
      url.searchParams.set("controls", "0");
    } else if (provider === "vimeo") {
      url.searchParams.set("muted", "1");
      url.searchParams.set("playsinline", "1");
      url.searchParams.set("loop", "1");
      url.searchParams.set("autopause", "0");
      url.searchParams.set("controls", "0");
      url.searchParams.set("dnt", "1");
    }
    playerURL = url.href;
  }
  return (
    <div
      ref={container}
      className="inline-video"
      data-inline-provider={provider}
      data-playback-state={
        error ? "unavailable" : playing ? "playing" : "paused"
      }
    >
      <SourceImage
        src={poster}
        alt=""
        className="absolute inset-0 h-full w-full object-contain"
      />
      {lifecycle.requested &&
        !error &&
        source &&
        (direct ? (
          <video
            ref={native}
            src={source}
            poster={poster}
            muted
            loop
            playsInline
            preload="none"
            className="absolute inset-0 h-full w-full object-contain"
            onLoadedData={() => {
              if (lifecycle.desired.current) controls.current?.play();
            }}
            onPlay={() => {
              if (!lifecycle.desired.current) native.current?.pause();
              setPlaying(lifecycle.desired.current);
            }}
            onPause={() => setPlaying(false)}
            onError={() => setError(true)}
          />
        ) : (
          (provider === "youtube" || provider === "vimeo") && (
            <iframe
              ref={frame}
              src={playerURL}
              title={`${title} inline video`}
              allow="autoplay; fullscreen; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          )
        ))}
      {!error && (direct || provider === "youtube" || provider === "vimeo") && (
        <div className="inline-video-controls">
          <PlaybackButton
            title={title}
            playing={playing}
            onClick={() => {
              if (playing) lifecycle.pause();
              else lifecycle.play();
            }}
          />
        </div>
      )}
      {error && (
        <div className="inline-video-unavailable">
          <p>Video unavailable</p>
          <a href={src} target="_blank" rel="noopener noreferrer">
            Open original source ↗
          </a>
        </div>
      )}
    </div>
  );
}
