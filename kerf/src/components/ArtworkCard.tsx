import OptimizedVideo, {type VideoHandle} from './OptimizedVideo';
import { state, derived, onMount, watch, onCleanup } from "@kerf-js/core";
import { update as writeBox } from "#/lib/reactive";
import type { Artwork } from "~/lib/content";
import InstagramCard from "./InstagramCard";
import VideoEmbed from "./VideoEmbed";
import { useViewportPlayback } from "./useViewportPlayback";
import { PlaybackButton, MediaIcon } from "./MediaControls";
import { newTabProps } from "~/lib/new-tab";
import { useAdaptiveVideo } from "./useAdaptiveVideo";
import { useMediaPreference, useSaveData } from "./useMediaPreference";
import { adaptivePoster, adaptivePreview } from "~/lib/adaptive-media";
import { paintingPoster } from "~/lib/painting-source";
export type { Artwork } from "~/lib/content";
function Poster({ artwork, priority, }: {
    artwork: Artwork;
    priority: boolean;
}) {
    const still = derived(() => artwork.poster || adaptivePreview(artwork.videoSrc)?.poster);
    const source = derived(() => adaptivePoster(still.value ?? ""));
    const poster = derived(() => paintingPoster(source.value));
    return <>{!still.value ? null : (<picture className="block h-full w-full">
      {poster.value.avif && (<source type="image/avif" srcSet={poster.value.avif} sizes="(max-width: 767px) calc(100vw - 40px), 960px"/>)}
      <img src={source.value} srcSet={poster.value.srcSet} sizes="(max-width: 767px) calc(100vw - 40px), 960px" alt={artwork.title} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} width={poster.value.local ? 960 : undefined} height={poster.value.local ? 960 : undefined} decoding="async" className="h-full w-full object-contain"/>
    </picture>)}</>;
}
export default function ArtworkCard({ artwork, showCaption = true, aspect = "square", ratio, originalFlow = false, trailer = false, naturalAspect = false, priority = false, }: {
    artwork: Artwork;
    showCaption?: boolean;
    aspect?: "square" | "portrait";
    ratio?: number;
    originalFlow?: boolean;
    trailer?: boolean;
    naturalAspect?: boolean;
    priority?: boolean;
}) {
    const container = { current: null as HTMLDivElement | null | undefined };
    const video = { current: null as VideoHandle | null | undefined };
    const playing = state(false);
    const lifecycle = useViewportPlayback(container, () => artwork.kind !== "video", (wanted) => {
        if (!wanted)
            video.current?.pause();
        else if (video.current?.readyState)
            void video.current.play().catch(() => writeBox(playing, false));
    }, 0.5);
    const { requested, wanted } = lifecycle;
    const smallScreen = useMediaPreference("(max-width: 767px)");
    const savingData = useSaveData();
    const mobile = derived(() => smallScreen.value || savingData.value);
    const sourceReady = derived(() => smallScreen.value !== undefined);
    const shownSource = state("");
    const error = state(false);
    const intrinsic = state<{
        src: string;
        ratio: number;
    } | null>(null);
    const muted = state(true);
    const selectedSource = derived(() => mobile.value && artwork.mobileVideoSrc
        ? artwork.mobileVideoSrc
        : artwork.previewSrc || artwork.videoSrc);
    useAdaptiveVideo(video, () => requested.value && sourceReady.value && !error.value ? selectedSource.value : undefined, () => wanted.value);
    const mediaRatio = derived(() => ratio ??
        (naturalAspect ? adaptivePreview(artwork.videoSrc)?.ratio : undefined) ??
        (naturalAspect && intrinsic.value?.src === selectedSource.value
            ? intrinsic.value.ratio
            : undefined));
    onMount(() => watch(() => [wanted.value, requested.value, error.value, sourceReady.value, selectedSource.value], () => {
        const element = video.current;
        if (wanted.value && !error.value)
            void element?.play().catch(() => writeBox(playing, false));
        else
            element?.pause();
        return () => {
            element?.pause();
        };
    }));
    const toggle = () => {
        if (playing.value)
            lifecycle.pause();
        else {
            writeBox(error, false);
            lifecycle.play();
        }
    };
    return <>{artwork.kind === "embed" ? (<article data-save-url={artwork.videoSrc||artwork.poster} data-artwork={artwork.id} className="mb-10 text-center">
        <h2 className="text-waambat-pink text-[22px]">{artwork.title}</h2>
        <VideoEmbed src={artwork.videoSrc} title={artwork.title} poster={artwork.poster} ratio={ratio}/>
        <p>{artwork.description}</p>
        <a href={artwork.tokenLink} {...newTabProps(artwork.tokenLink)}>
          View collection ↗
        </a>
      </article>) : artwork.kind === "instagram" ? <InstagramCard artwork={artwork}/> : (<article data-save-url={artwork.videoSrc||artwork.poster} data-artwork={artwork.id} data-playback-state={error.value ? "unavailable"
            : playing.value ? "playing"
                : requested.value ? "paused"
                    : "idle"} className={originalFlow ? "original-artwork text-center" : "mb-10 text-center"} style={originalFlow
            ? ({
                "--artwork-gap": `${artwork.precedingGap ?? 200}px`,
            } as Record<string, string | number | undefined>)
            : undefined}>
      {artwork.kind !== "link" && (<div ref={node => {
                container.current = node;
            }} style={mediaRatio.value ? { aspectRatio: mediaRatio.value }
                : naturalAspect
                    ? { height: 150 }
                    : undefined} className={`artwork-media relative w-full bg-black ${naturalAspect ? "" : aspect === "portrait" ? "aspect-[4/5]" : "aspect-square"}`}>
          <a href={trailer ? undefined : artwork.tokenLink} {...newTabProps(trailer ? undefined : artwork.tokenLink)} aria-label={`Open ${artwork.title} original ${artwork.kind === "image" ? "inscription" : "token"} page`} className="relative block h-full w-full">
            <Poster artwork={artwork} priority={priority}/>
            {artwork.kind === "video" && requested.value && sourceReady.value && !error.value && (<OptimizedVideo source={selectedSource.value ?? ""} width={960} height={960} poster={adaptivePoster(artwork.poster)} key={selectedSource.value} ref={node => {
                    video.current = node;
                }} muted={muted.value} loop={!trailer} controls={trailer} playsInline preload="none" onLoadedMetadata={(event) => {
                    const element = event.currentTarget;
                    if (naturalAspect &&
                        element.videoWidth &&
                        element.videoHeight)
                        writeBox(intrinsic, {
                            src: selectedSource.value,
                            ratio: element.videoWidth / element.videoHeight,
                        });
                }} onLoadedData={() => {
                    if (lifecycle.desired.current)
                        void video.current?.play().catch(() => writeBox(playing, false));
                }} onPlay={() => {
                    if (!lifecycle.desired.current)
                        video.current?.pause();
                    writeBox(playing, lifecycle.desired.current);
                }} onPause={() => writeBox(playing, false)} onPlaying={() => writeBox(shownSource, selectedSource.value)} onError={(event) => {
                    if (!event.currentTarget.error)
                        return;
                    writeBox(error, true);
                    writeBox(playing, false);
                    writeBox(shownSource, "");
                }} className="absolute inset-0 h-full w-full object-contain" style={{ opacity: shownSource.value === selectedSource.value ? 1 : 0 }}/>)}
          </a>
          {artwork.kind === "video" && !trailer && (<div className="painting-controls">
              <PlaybackButton playing={playing.value} title={artwork.title} onClick={toggle} error={error.value}/>
            </div>)}
          {error.value && (<div role="status" className="absolute inset-x-2 bottom-14 text-sm text-white">
              <p>Video could not load.</p>
              <a href={artwork.videoSrc} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">
                Open original video ↗
              </a>
            </div>)}
          {artwork.kind === "video" && trailer && (<div className="absolute top-3 right-3 flex gap-2">
              <PlaybackButton playing={playing.value} title={artwork.title} onClick={toggle} error={error.value}/>
              <button type="button" onClick={() => writeBox(muted, !muted.value)} aria-pressed={!muted.value} className="media-control" aria-label={muted.value ? "Enable trailer audio" : "Mute trailer audio"}>
                <MediaIcon kind={muted.value ? "muted" : "volume"}/>
              </button>
            </div>)}
        </div>)}
      {showCaption && (<div className="artwork-caption">
          <h2 className="text-waambat-pink mt-5 text-[26px] leading-snug">
            <a href={trailer ? undefined : artwork.tokenLink} {...newTabProps(trailer ? undefined : artwork.tokenLink)}>
              {artwork.title}
            </a>
          </h2>
          {artwork.year && <p className="mt-2">{artwork.year}</p>}
          {(artwork.captionLines ?? [artwork.description]).map((line, index) => (<p key={index} className="mt-1 whitespace-pre-line">
                {line}
              </p>))}
        </div>)}
      {artwork.kind === "link" && (<a href={artwork.tokenLink} {...newTabProps(artwork.tokenLink)} className="text-waambat-link mt-3 inline-block">
          {artwork.title.includes("Paper")
                ? "Read the Pink Paper"
                : "View collection"}{" "}
          ↗
        </a>)}
    </article>)}</>;
}
