import { state, derived, onMount, watch, onCleanup } from "@kerf-js/core";
import { update as writeBox } from "#/lib/reactive";
import {playbackSource as videoSource} from "~/lib/playback-source";
import SourceImage from "./SourceImage";
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
    return <>{!target.value ? <p>Unsupported source. Review this entry in the studio.</p> : (<figure data-save-url={src} className={compact ? "h-full w-full" : "my-8 w-full"}>
      <div className={`relative bg-black ${target.value.provider === "ordinals" ? "aspect-square" : "aspect-video"}`} style={ratio ? { aspectRatio: ratio } : undefined}>
        {loaded.value && target.value.player ? (target.value.direct ? (<video width={960} height={540} src={target.value.player} poster={poster || undefined} controls autoPlay playsInline preload="metadata" className="h-full w-full object-contain" onError={() => writeBox(loadedSource, null)}/>) : (<iframe src={target.value.player +
                (["youtube", "vimeo"].includes(target.value.provider)
                    ? `${target.value.player.includes("?") ? "&" : "?"}autoplay=1`
                    : "")} title={title} loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" className="h-full w-full border-0" onError={() => writeBox(loadedSource, null)}/>)) : (<button type="button" disabled={!target.value.player} onClick={() => writeBox(loadedSource, src)} className="text-waambat-pink relative flex h-full w-full items-center justify-center border border-white/20" aria-label={`Play ${title}`}>
            {poster ? (<SourceImage src={poster} alt="" className="absolute inset-0 h-full w-full object-contain"/>) : target.value.provider === "youtube" ? (
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
          <p className="text-xs text-white/60">
            Loading a player contacts {target.value.provider}. If access is restricted
            or unavailable, use the original link.
          </p>
        </figcaption>)}
    </figure>)}</>;
}
