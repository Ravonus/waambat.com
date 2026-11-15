import {firstFrame} from '#/lib/first-frame';
import VideoStill from './VideoStill';
import OptimizedVideo,{type VideoHandle} from './OptimizedVideo';
import {useAdaptiveVideo} from './useAdaptiveVideo';
import { state, derived, onMount, watch, onCleanup } from "@kerf-js/core";
import { update as writeBox } from "#/lib/reactive";
import {playbackSource as videoSource} from "~/lib/playback-source";
import { MediaIcon } from "./MediaControls";
export default function VideoEmbed({ src, title, poster = "", activated = false, ratio, compact = false, }: {
    src: string;
    title: string;
    poster?: string;
    activated?: boolean;
    ratio?: number;
    compact?: boolean;
}) {
    const loadedSource = state.linked<string | null>(() => activated ? src : null);
    const loaded = derived(() => loadedSource.value === src);
    const target = derived(() => videoSource(src));
    const hasFirstFrame=derived(()=>!!firstFrame(src));
    // Provider-restricted Vimeo sources reject the player; show the poster and the original
    // link (as the inline tiles do) instead of Vimeo's own error page.
    const frame = state<HTMLIFrameElement | null>(null);
    const unavailable = state(false);
    // A new load (or closing and replaying) gets a fresh attempt at the player.
    onMount(() => watch(() => loadedSource.value, () => writeBox(unavailable, false)));
    onMount(() => watch(() => [frame.value, target.value?.provider], () => {
        const element = frame.value;
        if (!element || target.value?.provider !== "vimeo")
            return;
        let cancelled = false;
        let player: import("@vimeo/player").default | undefined;
        const fail = () => {
            if (!cancelled)
                writeBox(unavailable, true);
        };
        void import("@vimeo/player")
            .then(({ default: Player }) => {
            if (cancelled)
                return;
            // One player per iframe (the SDK reuses it for the same element).
            player = new Player(element);
            player.on("error", fail);
            player.ready().catch(fail);
        })
            .catch(() => { });
        return () => {
            cancelled = true;
            const current = player;
            current?.off("error", fail);
            // destroy() drops the SDK's window message listener, but it also removes
            // its iframe, so only call it after the update, once the page itself has removed the frame.
            setTimeout(() => {
                if (current && !element.isConnected)
                    void current.destroy().catch(() => { });
            }, 0);
        };
    }));
    return <>{!target.value ? <p>Unsupported source. Review this entry in the studio.</p> : (<figure data-save-url={src} className={compact ? "h-full w-full" : "my-8 w-full"}>
      <div className={`relative bg-black ${target.value.provider === "ordinals" ? "aspect-square" : "aspect-video"}`} style={ratio ? { aspectRatio: ratio } : undefined}>
        {loaded.value && unavailable.value ? (<>
            {(poster||hasFirstFrame.value) && (<VideoStill source={src} fallback={poster} alt="" className="absolute inset-0 h-full w-full object-contain"/>)}
            <div className="inline-video-unavailable" role="status">
              <p>Video unavailable</p>
              <a href={target.value.original} target="_blank" rel="noopener noreferrer">
                Open original source ↗
              </a>
            </div>
          </>) : loaded.value && target.value.player ? (target.value.direct ? (<DirectPlayer source={src} poster={poster} onError={()=>writeBox(loadedSource,null)}/>) : (<iframe src={target.value.player +
                (["youtube", "vimeo"].includes(target.value.provider)
                    ? `${target.value.player.includes("?") ? "&" : "?"}autoplay=1`
                    : "")} ref={node => writeBox(frame, node)} title={title} loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" className="h-full w-full border-0" onError={() => writeBox(loadedSource, null)}/>)) : (<button type="button" disabled={!target.value.player} onClick={() => writeBox(loadedSource, src)} className="text-waambat-pink relative flex h-full w-full items-center justify-center border border-white/20" aria-label={`Play ${title}`}>
            {(poster||hasFirstFrame.value) ? (<VideoStill source={src} fallback={poster} alt="" className="absolute inset-0 h-full w-full object-contain"/>) : target.value.provider === "youtube" ? (
            // eslint-disable-next-line @next/next/no-img-element -- Official thumbnail, requested by the browser only.
            <img width={480} height={360} src={`https://i.ytimg.com/vi/${target.value.player.split("/").at(-1)}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-contain"/>) : null}
            <span className="media-control relative" aria-hidden="true">
              <MediaIcon kind="play"/>
            </span>
          </button>)}
      </div>
      {!compact && (<figcaption className="mt-3 text-sm">
          {loaded.value && (<button type="button" onClick={() => writeBox(loadedSource, null)} className="mr-4 underline">
              Close player
            </button>)}
          <a href={target.value.original} target="_blank" rel="noopener noreferrer" className="text-waambat-link">
            Open original source ↗
          </a>
          {!target.value.direct&&<p className="text-xs text-white/60">
            Loading a player contacts {target.value.provider}. If access is restricted
            or unavailable, use the original link.
          </p>}
        </figcaption>)}
    </figure>)}</>;
}

function DirectPlayer({source,poster,onError}:{source:string;poster:string;onError:()=>void}){
 const player={current:null as VideoHandle|null|undefined};
 const ready=state(false),loadedPoster=state<string|undefined>(undefined);
 const quality=useAdaptiveVideo(player,()=>ready.value?source:undefined,()=>true);
 return <div className="relative h-full w-full"><VideoStill source={source} fallback={poster} alt="" priority className="absolute inset-0 h-full w-full object-contain" onReady={(_,url)=>{loadedPoster.value=url;ready.value=true;}}/>{ready.value&&<OptimizedVideo source={source} width={960} height={540} ref={node=>player.current=node} poster={loadedPoster.value} controls autoPlay playsInline preload="none" style={{opacity:quality.sharp.value?1:0}} className="absolute inset-0 h-full w-full object-contain" onError={onError}/>}</div>;
}
