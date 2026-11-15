import {initialMediaLevel,mediaConnection,mediaBandwidth} from "@kerf-js/media/browser";
import type {VideoHandle} from './OptimizedVideo';
import {localVideo} from '#/lib/local-media';
import type {RefObject} from "./useViewportPlayback";
import { state, derived, onMount, watch, onCleanup } from "@kerf-js/core";
import { update as writeBox } from "#/lib/reactive";
import type Hls from "hls.js";
import { adaptiveStream } from "~/lib/adaptive-media";
import { adaptiveVideoConfig } from "~/lib/adaptive-video-config";
// Small initial segments, measured quality upgrades, and a short forward buffer.
// MSE loading stops when playback pauses. Native HLS covers devices without MSE.
export function useAdaptiveVideo(ref: RefObject<VideoHandle>, source: () => string | undefined, wanted: () => boolean, preload: boolean | (()=>boolean) = false) {
    const controller = { current: null as (Hls | null) | null | undefined };
    const shouldPlay = () => wanted();
    const shouldLoad = () => wanted() || (typeof preload === "function" ? preload() : preload);
    onMount(() => watch(() => [source()], () => {
        const video = ref.current;
        const src = source();
        if (!(video instanceof HTMLVideoElement) || !src)
            return;
        const stream = adaptiveStream(src);
        let cancelled = false, fallbackUsed = false, nativeUsed = false;
        const destroy = () => {
            controller.current?.destroy();
            controller.current = null;
        };
        const play = () => {
            if (shouldPlay())
                void video.play().catch(() => { });
        };
        const fallback = () => {
            if (cancelled || fallbackUsed)
                return;
            fallbackUsed = true;
            destroy();
            video.src = localVideo(src);
            video.dataset.delivery = "mp4";
            play();
        };
        const nativeFallback = () => {
            if (cancelled)
                return;
            if (!nativeUsed &&
                stream &&
                video.canPlayType("application/vnd.apple.mpegurl")) {
                nativeUsed = true;
                destroy();
                video.src = stream;
                video.dataset.delivery = "native-hls";
                play();
            }
            else
                fallback();
        };
        const onNativeError = () => {
            if (video.dataset.delivery === "native-hls")
                fallback();
        };
        video.addEventListener("error", onNativeError);
        const load = async () => {
            if (!stream) {
                fallback();
                return;
            }
            try {
                const { default: Player } = await import("hls.js/light");
                if (cancelled)
                    return;
                if (!Player.isSupported()) {
                    nativeFallback();
                    return;
                }
                const player = new Player({...adaptiveVideoConfig,abrEwmaDefaultEstimate:mediaBandwidth(mediaConnection())});
                controller.current = player;
                video.dataset.delivery = "adaptive-hls";
                player.on(Player.Events.ERROR, (_event, data) => {
                    if (data.fatal)
                        nativeFallback();
                });
                player.on(Player.Events.MANIFEST_PARSED, () => {
          player.startLevel=initialMediaLevel(player.levels,video.clientWidth,video.clientHeight,mediaConnection(),devicePixelRatio);
                    if (shouldLoad())
                        player.startLoad();
                    play();
                });
                player.attachMedia(video);
                player.loadSource(stream);
            }
            catch {
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
    }));
    onMount(() => watch(() => [wanted(), typeof preload === "function" ? preload() : preload], () => {
        if (shouldLoad())
            controller.current?.startLoad(-1);
        else
            controller.current?.stopLoad();
    }));
}
