"use client";
import { useEffect, useRef, type RefObject } from "react";
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
  const desired = useRef(wanted);
  const warm = useRef(preload);
  useEffect(() => {
    desired.current = wanted;
    warm.current = preload;
  }, [wanted, preload]);
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
    };
    const play = () => {
      if (desired.current) void video.play().catch(() => {});
    };
    const fallback = () => {
      if (cancelled || fallbackUsed) return;
      fallbackUsed = true;
      destroy();
      video.src = source;
      video.dataset.delivery = "mp4";
      play();
    };
    const nativeFallback = () => {
      if (cancelled) return;
      if (
        !nativeUsed &&
        stream &&
        video.canPlayType("application/vnd.apple.mpegurl")
      ) {
        nativeUsed = true;
        destroy();
        video.src = stream;
        video.dataset.delivery = "native-hls";
        play();
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
          nativeFallback();
          return;
        }
        const player = new Player(adaptiveVideoConfig);
        controller.current = player;
        video.dataset.delivery = "adaptive-hls";
        player.on(Player.Events.ERROR, (_event, data) => {
          if (data.fatal) nativeFallback();
        });
        player.on(Player.Events.MANIFEST_PARSED, () => {
          if (desired.current || warm.current) player.startLoad();
          play();
        });
        player.attachMedia(video);
        player.loadSource(stream);
      } catch {
        nativeFallback();
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
    if (wanted || preload) controller.current?.startLoad(-1);
    else controller.current?.stopLoad();
  }, [wanted, preload]);
}
