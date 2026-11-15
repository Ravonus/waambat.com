"use client";
import {initialMediaLevel,mediaConnection,mediaStartPlaylist} from "@kerf-js/media/browser";
import { useEffect, useEffectEvent, useRef, type RefObject } from "react";
import type Hls from "hls.js";
import { adaptiveStream } from "~/lib/adaptive-media";
import { adaptiveVideoConfig } from "~/lib/adaptive-video-config";

// Small initial segments, measured quality upgrades, and a short forward buffer.
// MSE loading stops when playback pauses. Native HLS covers devices without MSE.
export function useAdaptiveVideo(
  ref: RefObject<HTMLVideoElement | null>,
  source: string | undefined,
  wanted: boolean,
  preload = false,
) {
  const controller = useRef<Hls | null>(null);
  const ready = useRef(false);
  const shouldPlay = useEffectEvent(() => wanted);
  const shouldLoad = useEffectEvent(() => wanted || preload);
  useEffect(() => {
    const video = ref.current;
    if (!video || !source) return;
    const stream = adaptiveStream(source);
    let cancelled = false,
      fallbackUsed = false,
      nativeUsed = false;
    const destroy = () => {
      controller.current?.destroy();
      controller.current = null;
      ready.current = false;
    };
    const play = () => {
      if (shouldPlay()) void video.play().catch(() => {});
    };
    const fallback = () => {
      if (cancelled || fallbackUsed) return;
      fallbackUsed = true;
      destroy();
      video.src = source;
      video.dataset.delivery = "mp4";
      play();
    };
    const nativeFallback = async () => {
      if (cancelled) return;
      if (
        !nativeUsed &&
        stream &&
        video.canPlayType("application/vnd.apple.mpegurl")
      ) {
        nativeUsed = true;
        destroy();
        try {
          const playlist = await mediaStartPlaylist(stream, video.clientWidth || video.width, video.clientHeight || video.height, devicePixelRatio);
          if (cancelled) return;
          video.src = playlist;
          video.dataset.delivery = "native-hls";
          play();
        } catch { fallback(); }
      } else fallback();
    };
    const onNativeError = () => {
      if (video.dataset.delivery === "native-hls") fallback();
    };
    video.addEventListener("error", onNativeError);
    const load = async () => {
      if (!stream) {
        fallback();
        return;
      }
      try {
        const { default: Player } = await import("hls.js/light");
        if (cancelled) return;
        if (!Player.isSupported()) {
          void nativeFallback();
          return;
        }
        const player = new Player(adaptiveVideoConfig);
        controller.current = player;
        video.dataset.delivery = "adaptive-hls";
        player.on(Player.Events.ERROR, (_event, data) => {
          if (data.fatal) void nativeFallback();
        });
        player.on(Player.Events.FRAG_BUFFERED,()=>{if(!shouldPlay())player.stopLoad();});
        player.on(Player.Events.MANIFEST_PARSED, () => {
          const level=initialMediaLevel(player.levels,video.clientWidth||video.width,video.clientHeight||video.height,mediaConnection(),devicePixelRatio);
          player.startLevel=level;player.loadLevel=level;ready.current=true;
          if (shouldLoad()) player.startLoad();
          play();
        });
        player.attachMedia(video);
        player.loadSource(stream);
      } catch {
        void nativeFallback();
      }
    };
    void load();
    return () => {
      cancelled = true;
      video.removeEventListener("error", onNativeError);
      destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [ref, source]);
  useEffect(() => {
    if (!ready.current) return;
    if (wanted || preload) controller.current?.startLoad(-1);
    else controller.current?.stopLoad();
  }, [wanted, preload]);
}
