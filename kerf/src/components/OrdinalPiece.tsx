import { state, derived, onMount, watch, onCleanup } from "@kerf-js/core";
import { update as writeBox } from "#/lib/reactive";
import type { Artwork } from "~/lib/content";
import { videoSource } from "~/lib/video-source";
import { DEFAULT_LIVE_SETTLE_MS, LIVE_SETTLE_MS, opensLive, } from "~/lib/ordinal-sources";
import { useViewportPlayback } from "./useViewportPlayback";
import { PlaybackButton } from "./MediaControls";
import SourceImage from "./SourceImage";
import styles from "./OrdinalPiece.module.css";
// One live Ordinals artwork. Its cached loop is on screen at once (a same-origin file the CDN keeps
// forever), and the inscription itself opens on request: opening it mounts the live player over the
// loop and fades it in when it has loaded. The live document is kept, never reloaded, once opened,
// because these opaque inscriptions have no verified pause protocol; "Back to preview" is the
// visitor's own choice to drop it. The page never scrolls into a trapped iframe: the live piece takes
// the pointer only while "Interact" is on (Escape or moving focus away turns it off).
export default function OrdinalPiece({ artwork, priority = false, }: {
    artwork: Artwork;
    priority?: boolean;
}) {
    const container = { current: null as HTMLDivElement | null | undefined };
    const video = { current: null as HTMLVideoElement | null | undefined };
    const interact = { current: null as HTMLButtonElement | null | undefined };
    const live = state(false);
    const shown = state(false);
    const interacting = state(false);
    const error = state(false);
    const playing = state(false);
    const settle = { current: undefined as (ReturnType<typeof setTimeout> | undefined) | null | undefined };
    const source = derived(() => videoSource(artwork.videoSrc));
    const player = derived(() => source.value?.provider === "ordinals" ? source.value.player : "");
    const loop = derived(() => artwork.previewSrc);
    // LUX is the interactive piece; the videos are their loops. See opensLive.
    const canOpen = derived(() => opensLive(player.value, !!loop.value));
    const lifecycle = useViewportPlayback(container, () => !loop.value || shown.value, (wanted) => {
        if (!wanted)
            video.current?.pause();
        else if (video.current?.readyState)
            void video.current.play().catch(() => writeBox(playing, false));
    });
    const { wanted } = lifecycle;
    onMount(() => watch(() => [wanted.value, error.value], () => {
        const element = video.current;
        if (wanted.value && !error.value)
            void element?.play().catch(() => writeBox(playing, false));
        else
            element?.pause();
        return () => element?.pause();
    }));
    onMount(() => watch(() => [priority], () => {
        // The first pieces fetch their whole loop as soon as the page is interactive, unless the visitor
        // asked to save data; their posters are already on screen from the server render.
        const saving = (navigator as Navigator & {
            connection?: {
                saveData?: boolean;
            };
        }).connection?.saveData;
        if (priority && !saving && video.current)
            video.current.preload = "auto";
    }));
    onMount(() => watch(() => [interacting.value], () => {
        if (!interacting.value)
            return;
        const exit = (event: KeyboardEvent) => {
            if (event.key !== "Escape")
                return;
            writeBox(interacting, false);
            if (!document.querySelector("dialog[open]"))
                interact.current?.focus({ preventScroll: true });
        };
        const blur = () => {
            // Focusing the intentional cross-origin interaction is expected.
            if (document.activeElement?.tagName !== "IFRAME" ||
                !container.current?.contains(document.activeElement))
                writeBox(interacting, false);
        };
        document.addEventListener("keydown", exit);
        window.addEventListener("blur", blur);
        return () => {
            document.removeEventListener("keydown", exit);
            window.removeEventListener("blur", blur);
        };
    }));
    const open = () => {
        writeBox(live, true);
        writeBox(interacting, true);
    };
    onMount(() => watch(() => [], () => () => clearTimeout(settle.current ?? undefined)));
    const close = () => {
        clearTimeout(settle.current ?? undefined);
        writeBox(live, false);
        writeBox(shown, false);
        writeBox(interacting, false);
    };
    const toggle = () => {
        if (playing.value)
            lifecycle.pause();
        else {
            writeBox(error, false);
            lifecycle.play();
        }
    };
    return (<div>
      <div ref={node => {
            container.current = node;
        }} className={styles.stage} style={{ aspectRatio: artwork.aspectRatio ?? 1 }} data-ordinal-player={artwork.id} data-live={live.value ? (shown.value ? "shown" : "loading") : "off"} data-interacting={interacting.value}>
        {loop.value && !error.value ? (<video width={960} height={540} ref={node => {
                video.current = node;
            }} src={loop.value} poster={artwork.poster || undefined} muted loop playsInline preload="metadata" aria-label={canOpen.value ? `${artwork.title}, preview loop` : artwork.title} onPlay={() => {
                if (!lifecycle.desired.current)
                    video.current?.pause();
                writeBox(playing, lifecycle.desired.current);
            }} onPause={() => writeBox(playing, false)} onLoadedData={() => {
                if (lifecycle.desired.current)
                    void video.current?.play().catch(() => writeBox(playing, false));
            }} onError={() => {
                writeBox(error, true);
                writeBox(playing, false);
            }} className={styles.layer}/>) : artwork.poster ? (<SourceImage src={artwork.poster} alt={`${artwork.title}, preview`} eager={priority} sizes="(max-width: 767px) calc(100vw - 40px), 400px" className={styles.layer}/>) : (<div className={styles.name} aria-hidden="true">
            {artwork.title}
          </div>)}
        {live.value && player.value && (<iframe id={`ordinal-frame-${artwork.id}`} src={player.value} title={artwork.title} allow="autoplay; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" onLoad={() => {
                // Keep the loop up until the piece has drawn something worth showing.
                clearTimeout(settle.current ?? undefined);
                settle.current = setTimeout(() => writeBox(shown, true), LIVE_SETTLE_MS[player.value] ?? DEFAULT_LIVE_SETTLE_MS);
            }} tabIndex={interacting.value ? undefined : -1} className={`${styles.layer} ${styles.live}`} style={{
                pointerEvents: interacting.value && shown.value ? "auto" : "none",
            }}/>)}
        {live.value && !shown.value && (<p role="status" className={styles.status}>
            Opening the live piece…
          </p>)}
      </div>
      <div className={styles.controls}>
        {live.value && player.value ? (<>
            <button ref={node => {
                interact.current = node;
            }} type="button" aria-pressed={interacting.value} aria-controls={`ordinal-frame-${artwork.id}`} onClick={() => writeBox(interacting, (value) => !value)} className={`ordinal-gate ${styles.action}`}>
              {interacting.value ? "Exit interaction" : "Interact"}
            </button>
            <button type="button" onClick={close} className={`ordinal-close ${styles.action}`}>
              Back to preview
            </button>
          </>) : (<>
            {loop.value && !error.value && (<PlaybackButton playing={playing.value} title={`${artwork.title} preview`} onClick={toggle}/>)}
            {canOpen.value && (<button type="button" onClick={open} aria-label={`Interact live with ${artwork.title}`} className={`ordinal-open ${styles.action}`}>
                Interact live
              </button>)}
          </>)}
      </div>
    </div>);
}
