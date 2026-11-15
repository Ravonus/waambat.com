import VideoStill from './VideoStill';
import {firstFramePoster} from '#/lib/first-frame';
import OptimizedVideo, {type VideoHandle} from './OptimizedVideo';
import { state, derived, onMount, watch, onCleanup } from "@kerf-js/core";
import { update as writeBox } from "#/lib/reactive";
import SiteLink from "./navigation/SiteLink";
import type { Artwork, Content } from "~/lib/content";
import { PlaybackButton } from "./MediaControls";
import { useViewportPlayback } from "./useViewportPlayback";
import { useAdaptiveVideo } from "./useAdaptiveVideo";
import { useMediaPreference } from "./useMediaPreference";
import { adaptivePoster } from "~/lib/adaptive-media";
import styles from "./Hero.module.css";
// The portrait composition is for phones held upright. A phone on its side has
// the width of a small tablet but the shape of the landscape banner.
const PORTRAIT_PHONE = "(max-width: 767px) and (orientation: portrait)";
// The home banner: a silent montage of her own works with the live wordmark in its quiet column.
// When the banner has an ending loop it plays once, ends on its last shot, and that shot carries on
// as a second, seamlessly looping video: the montage never replays. Without one the whole video
// repeats. Content (media, poster, titles, logo) comes from an ordinary section/artwork so the
// studio edits it like everything else.
export default function Hero({ section, item, preview = false, }: {
    section: Content["sections"][number];
    item: Artwork;
    preview?: boolean;
}) {
    const frame = { current: null as HTMLDivElement | null | undefined };
    const video = { current: null as VideoHandle | null | undefined };
    const endless = { current: null as VideoHandle | null | undefined };
    const mobile = useMediaPreference(PORTRAIT_PHONE);
    const sourceReady = derived(() => mobile.value !== undefined);
    const playing = state(false);
    const posterReadyFor = state("");
    const loadedPoster = state<string|undefined>(undefined);
    const shown = state(false);
    const error = state(false);
    // "intro" is the video that plays once; "loop" is the ending that repeats.
    const phase = state<"intro" | "loop">("intro");
    const loopWanted = state(false);
    const loopShown = state(false);
    const activeVideo = () => phase.value === "loop" ? endless.current : video.current;
    const lifecycle = useViewportPlayback(frame, false, (wanted) => {
        const element = activeVideo();
        if (!wanted)
            element?.pause();
        else if (element?.readyState)
            void element.play().catch(() => writeBox(playing, false));
    });
    const { requested, wanted } = lifecycle;
    onMount(() => watch(() => [wanted.value, requested.value, error.value, phase.value, sourceReady.value, mobile.value], () => {
        const element = phase.value === "loop" ? endless.current : video.current;
        if (wanted.value && !error.value)
            void element?.play().catch(() => writeBox(playing, false));
        else
            element?.pause();
        return () => element?.pause();
    }));
    const portrait = derived(() => mobile.value && !!item.mobileVideoSrc);
    const source = derived(() => portrait.value ? item.mobileVideoSrc : item.videoSrc);
    // The ending loop follows the video it was rendered with (portrait with portrait).
    const loopSource = derived(() => portrait.value ? item.mobileLoopSrc : item.loopSrc);
    useAdaptiveVideo(video, () => requested.value && sourceReady.value && posterReadyFor.value===source.value && !error.value ? source.value : undefined, () => wanted.value && phase.value === "intro");
    useAdaptiveVideo(endless, () => requested.value && sourceReady.value && !error.value && loopWanted.value ? loopSource.value : undefined, () => wanted.value && phase.value === "loop", () => wanted.value && loopWanted.value);
    // A poster-only banner is a legitimate choice; it just has nothing to play.
    const playable = derived(() => !!source.value);
    const ratio = derived(() => item.aspectRatio ?? 16 / 9);
    const mobileRatio = derived(() => item.mobileAspectRatio ?? ratio.value);
    const toggle = () => {
        if (playing.value)
            lifecycle.pause();
        else {
            writeBox(error, false);
            lifecycle.play();
        }
    };
    return (<section aria-label={section.title} className={styles.hero} data-hero data-save-url={item.videoSrc||item.poster} data-playback-state={error.value ? "unavailable"
            : playing.value ? "playing"
                : requested.value ? "paused"
                    : "idle"} style={{
            "--hero-ratio": ratio.value,
            "--hero-ratio-mobile": mobileRatio.value,
        } as Record<string, string | number | undefined>}>
      <div ref={node => {
            frame.current = node;
        }} className={styles.frame}>
        <VideoStill source={item.videoSrc||""} mobileSource={item.mobileVideoSrc} media={PORTRAIT_PHONE} fallback={adaptivePoster(item.poster)} mobileFallback={item.mobilePoster?adaptivePoster(item.mobilePoster):undefined} alt={item.title} priority className={styles.poster} sizes="(max-width: 767px) 100vw, 1600px" onReady={(source,poster)=>{loadedPoster.value=poster;posterReadyFor.value=source;}}/>
        {playable.value && requested.value && sourceReady.value && posterReadyFor.value===source.value && !error.value && (<OptimizedVideo source={source.value ?? ""} width={1920} height={1080} ref={node => {
                video.current = node;
            }} poster={loadedPoster.value} muted loop={!loopSource.value} playsInline preload="none" aria-label={item.title} data-shown={shown.value} data-done={loopShown.value} className={styles.video} onLoadedData={() => {
                if (lifecycle.desired.current && phase.value === "intro")
                    void video.current?.play().catch(() => writeBox(playing, false));
            }} onPlaying={() => writeBox(shown, true)} onPlay={() => {
                if (!lifecycle.desired.current)
                    video.current?.pause();
                else if (phase.value === "intro")
                    writeBox(playing, lifecycle.desired.current);
            }} onPause={(event) => {
                // Reaching the end pauses the video; that is not the visitor pausing the banner.
                if (!event.currentTarget.ended)
                    writeBox(playing, false);
            }} onTimeUpdate={(event) => {
                // Start fetching the ending loop well before it is needed, so the hand-over has nothing to wait for.
                const element = event.currentTarget;
                if (loopSource.value &&
                    !loopWanted.value &&
                    element.duration - element.currentTime < 8)
                    writeBox(loopWanted, true);
            }} onEnded={() => {
                if (!loopSource.value)
                    return;
                writeBox(loopWanted, true);
                writeBox(phase, "loop");
            }} onError={(event) => {
                if (!event.currentTarget.error)
                    return;
                writeBox(error, true);
                writeBox(playing, false);
                writeBox(shown, false);
            }}/>)}
        {playable.value && requested.value && sourceReady.value && !error.value && loopWanted.value && loopSource.value && (<OptimizedVideo source={loopSource.value ?? ""} width={1920} height={1080} poster={firstFramePoster(loopSource.value,adaptivePoster(item.poster))} ref={node => {
                endless.current = node;
            }} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} data-shown={loopShown.value} className={styles.video} onCanPlay={() => {
                if (phase.value === "loop" && lifecycle.desired.current)
                    void endless.current?.play().catch(() => writeBox(playing, false));
            }} onPlaying={() => {
                // The loop's first frame is the frame after the video's last, so the swap is not visible.
                writeBox(loopShown, true);
                writeBox(playing, true);
            }} onPlay={() => {
                if (!lifecycle.desired.current)
                    endless.current?.pause();
            }} onPause={() => {
                if (phase.value === "loop")
                    writeBox(playing, false);
            }} onError={() => {
                // The ending stays on the last frame of the video, which is the artwork's final shot.
                writeBox(playing, false);
            }}/>)}
        {/* The wordmark leads home, like the header wordmark it stands in for. */}
        <h1 data-hero-wordmark className={styles.wordmark}>
          <SiteLink href={preview ? "/admin/preview?page=nfts" : "/"} label="NFTs" aria-label={`${section.title} home`} className={styles.wordmarkLink}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Preserve the artist's original SVG. */}
            <img src={item.logoSrc || "/brand/waambat-sigil-original.svg"} width={484} height={500} alt=""/>
          </SiteLink>
        </h1>
        {playable.value && (<div className={styles.controls}>
            <PlaybackButton playing={playing.value} title={item.title} onClick={toggle} error={error.value}/>
            {error.value && (<p role="status" className={styles.status}>
                Video could not load. The still above is the artwork.
              </p>)}
          </div>)}
      </div>
    </section>);
}
