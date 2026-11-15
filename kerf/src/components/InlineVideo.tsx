import VideoStill from './VideoStill';
import OptimizedVideo, {type VideoHandle} from './OptimizedVideo';
import { state, derived, onMount, watch, onCleanup } from "@kerf-js/core";
import { update as writeBox } from "#/lib/reactive";
import {playbackSource as videoSource} from "~/lib/playback-source";
import { youtubeAPI } from "~/lib/youtube-api";
import { useViewportPlayback } from "./useViewportPlayback";
import {useAdaptiveVideo} from "./useAdaptiveVideo";
import { PlaybackButton } from "./MediaControls";
type Controls = {
    play: () => void;
    pause: () => void;
    currentTime: () => number | Promise<number>;
};
export default function InlineVideo({ src, poster, title, suspended = false, }: {
    src: string;
    poster: string;
    title: string;
    suspended?: boolean;
}) {
    const container = { current: null as HTMLDivElement | null | undefined };
    const frame = { current: null as HTMLIFrameElement | null | undefined };
    const native = { current: null as VideoHandle | null | undefined };
    const controls = { current: null as (Controls | null) | null | undefined };
    const playing = state(false);
    const stillReadyFor = state("");
    const loadedPoster = state<string|undefined>(undefined);
    const error = state(false);
    const lifecycle = useViewportPlayback(container, () => suspended, (wanted) => {
        if (wanted)
            controls.current?.play();
        else
            controls.current?.pause();
    });
    const target = derived(() => videoSource(src));
    const provider = derived(() => target.value?.provider);
    const source = derived(() => target.value?.player);
    const direct = derived(() => target.value?.direct);
    useAdaptiveVideo(native,()=>direct.value&&lifecycle.requested.value&&stillReadyFor.value===src&&!error.value?src:undefined,()=>lifecycle.wanted.value);
    // Read-only, on-demand browser QA. No timer, media polling or control API is
    // exposed. The sample comes from the provider SDK, rather than UI state.
    onMount(() => watch(() => [], () => {
        const element = container.current;
        const inspect = (event: Event) => {
            const receive = (event as CustomEvent<(time: number | null) => void>)
                .detail;
            if (typeof receive !== "function")
                return;
            void Promise.resolve()
                .then(() => controls.current?.currentTime() ?? null)
                .then(receive)
                .catch(() => receive(null));
        };
        element?.addEventListener("waambat:inspect-playback", inspect);
        return () => element?.removeEventListener("waambat:inspect-playback", inspect);
    }));
    onMount(() => watch(() => [lifecycle.requested.value, lifecycle.desired, source.value, provider.value, direct.value, stillReadyFor.value], () => {
        if (!lifecycle.requested.value || stillReadyFor.value!==src || !source.value || direct.value)
            return;
        const element = frame.current;
        if (!element)
            return;
        let cancelled = false;
        let destroy: (() => void) | undefined;
        const fail = () => {
            if (!cancelled) {
                controls.current?.pause();
                controls.current = null;
                cancelled = true;
                writeBox(error, true);
                writeBox(playing, false);
            }
        };
        if (provider.value === "youtube") {
            void youtubeAPI()
                .then((api) => {
                if (cancelled)
                    return;
                const player = new api.Player(element, {
                    events: {
                        onReady: () => {
                            if (cancelled)
                                return;
                            player.mute();
                            controls.current = {
                                play: () => player.playVideo(),
                                pause: () => player.pauseVideo(),
                                currentTime: () => player.getCurrentTime(),
                            };
                            if (lifecycle.desired.current)
                                player.playVideo();
                            else
                                player.pauseVideo();
                        },
                        onStateChange: (event: YT.OnStateChangeEvent) => {
                            if (cancelled)
                                return;
                            const running = event.data === api.PlayerState.PLAYING;
                            if (running && !lifecycle.desired.current)
                                player.pauseVideo();
                            writeBox(playing, running && lifecycle.desired.current);
                            if (event.data === api.PlayerState.ENDED &&
                                lifecycle.desired.current)
                                player.playVideo();
                        },
                        onError: fail,
                        onAutoplayBlocked: () => {
                            if (!cancelled)
                                writeBox(playing, false);
                        },
                    },
                });
                destroy = () => player.destroy();
            })
                .catch(fail);
        }
        else if (provider.value === "vimeo") {
            void import("@vimeo/player")
                .then(({ default: Player }) => {
                if (cancelled)
                    return;
                const player = new Player(element);
                const pause = () => {
                    void player.pause().catch(() => { });
                };
                const play = () => {
                    void player.play().catch(() => {
                        if (!cancelled)
                            writeBox(playing, false);
                    });
                };
                player.on("play", () => {
                    if (cancelled)
                        return;
                    if (!lifecycle.desired.current)
                        pause();
                    writeBox(playing, lifecycle.desired.current);
                });
                player.on("pause", () => {
                    if (!cancelled)
                        writeBox(playing, false);
                });
                player.on("error", fail);
                void player
                    .ready()
                    .then(async () => {
                    if (cancelled)
                        return;
                    await player.setMuted(true);
                    if (cancelled)
                        return;
                    controls.current = {
                        play,
                        pause,
                        currentTime: () => player.getCurrentTime(),
                    };
                    if (lifecycle.desired.current)
                        play();
                    else
                        pause();
                })
                    .catch(fail);
                destroy = () => {
                    void player.destroy().catch(() => { });
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
    }));
    onMount(() => watch(() => [direct.value, lifecycle.requested.value, lifecycle.wanted.value, stillReadyFor.value], () => {
        if (!direct.value || !lifecycle.requested.value || stillReadyFor.value!==src)
            return;
        // The <video> mounts in the same update that runs this watch, so its ref may
        // not be attached yet: read it at call time, never capture it here.
        controls.current = {
            play: () => {
                void native.current?.play().catch(() => writeBox(playing, false));
            },
            pause: () => native.current?.pause(),
            currentTime: () => native.current?.currentTime ?? 0,
        };
        if (lifecycle.wanted.value)
            controls.current.play();
        else
            controls.current.pause();
        return () => {
            native.current?.pause();
            controls.current = null;
        };
    }));
    const playerURL = derived(() => { if (!source.value || direct.value)
        return source.value ?? ''; const url = new URL(source.value); url.searchParams.set('autoplay', '0'); if (provider.value === 'youtube') {
        url.searchParams.set('enablejsapi', '1');
        url.searchParams.set('playsinline', '1');
        url.searchParams.set('mute', '1');
        url.searchParams.set('controls', '0');
    }
    else if (provider.value === 'vimeo') {
        for (const [k, v] of Object.entries({ muted: '1', playsinline: '1', loop: '1', autopause: '0', controls: '0', dnt: '1' }))
            url.searchParams.set(k, v);
    } return url.href; });
    return (<div ref={node => {
            container.current = node;
        }} className="inline-video" data-save-url={src} data-inline-provider={provider.value} data-playback-state={error.value ? "unavailable" : playing.value ? "playing" : "paused"}>
      <VideoStill source={src} fallback={poster} alt="" className="absolute inset-0 h-full w-full object-contain" onReady={(source,poster)=>{loadedPoster.value=poster;stillReadyFor.value=source;}}/>
      {lifecycle.requested.value &&
            !error.value && source.value && stillReadyFor.value===src &&
            (direct.value ? (<OptimizedVideo source={src} width={960} height={540} ref={node => {
                    native.current = node;
                }} poster={loadedPoster.value} muted loop playsInline preload="none" className="absolute inset-0 h-full w-full object-contain" onLoadedData={() => {
                    if (lifecycle.desired.current)
                        controls.current?.play();
                }} onPlay={() => {
                    if (!lifecycle.desired.current)
                        native.current?.pause();
                    writeBox(playing, lifecycle.desired.current);
                }} onPause={() => writeBox(playing, false)} onError={() => writeBox(error, true)}/>) : ((provider.value === "youtube" || provider.value === "vimeo") && (<iframe ref={node => {
                    frame.current = node;
                }} src={playerURL.value} title={`${title} inline video`} allow="autoplay; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen className="absolute inset-0 h-full w-full border-0"/>)))}
      {!error.value && (direct.value || provider.value === "youtube" || provider.value === "vimeo") && (<div className="inline-video-controls">
          <PlaybackButton title={title} playing={playing.value} onClick={() => {
                if (playing.value)
                    lifecycle.pause();
                else
                    lifecycle.play();
            }}/>
        </div>)}
      {error.value && (<div className="inline-video-unavailable">
          <p>Video unavailable</p>
          <a href={src} target="_blank" rel="noopener noreferrer">
            Open original source ↗
          </a>
        </div>)}
    </div>);
}
