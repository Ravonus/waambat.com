import { state, derived, onMount, watch, onCleanup } from "@kerf-js/core";
import { update as writeBox } from "#/lib/reactive";
import type { SitePage } from "~/lib/content";
import { archiveGroups } from "~/lib/archive-layout";
import SourceImage from "./SourceImage";
import VideoEmbed from "./VideoEmbed";
import InlineVideo from "./InlineVideo";
import { MediaIcon } from "./MediaControls";
import ArchivePreview from './ArchivePreview';
export default function Archive({ items }: {
    items: SitePage["archive"];
}) {
    const visible = derived(() => items.filter((i) => !i.archived));
    const viewable = derived(() => visible.value.filter((i) => !i.previewOnly));
    const dialog = { current: null as HTMLDialogElement | null | undefined };
    const selected = state<number | null>(null);
    const info = state(false);
    onMount(() => watch(() => [selected.value], () => {
        const el = dialog.current;
        if (!el || selected.value === null)
            return;
        if (!el.open)
            el.showModal();
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previous;
        };
    }));
    const index = derived(() => selected.value === null ? null : Math.min(selected.value, viewable.value.length - 1));
    const item = derived(() => index.value === null ? undefined : viewable.value[index.value]);
    const select = (next: number) => {
        writeBox(info, false);
        writeBox(selected, (next + viewable.value.length) % viewable.value.length);
    };
    return (<section aria-label="Art archive" className="pb-16">
      <div className="archive-montage">
        {archiveGroups(visible.value).map((row) => (<div key={row[0]!.id} className="archive-row">
            {row.map((art) => (<div key={art.id} className="archive-tile" style={{ '--artwork-ratio': art.ratio }} data-archive-artwork={art.id}>
                {art.previewOnly ? <ArchivePreview art={art}/> : art.embed ? (<InlineVideo key={art.embed} src={art.embed} poster={art.image} title={art.title || "Untitled artwork"} suspended={selected.value !== null}/>) : (<SourceImage src={art.image} alt="" sizes="(max-width: 767px) calc(100vw - 40px), 1100px" className="h-full w-full object-contain"/>)}
                {!art.previewOnly && <button type="button" className="media-control archive-expand" onClick={() => select(viewable.value.indexOf(art))} aria-label={`View ${art.title || "untitled artwork"}`} title="Open fullscreen viewer">
                  <MediaIcon kind="expand"/>
                </button>}
                {!art.previewOnly && art.title && (<div className="archive-caption">{art.title}</div>)}
              </div>))}
          </div>))}
      </div>
      <dialog ref={node => {
            dialog.current = node;
        }} className="archive-viewer" aria-label="Archive artwork viewer" onClose={() => {
            writeBox(selected, null);
            writeBox(info, false);
        }} onKeyDown={(e) => {
            if (index.value === null)
                return;
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                select(index.value + (e.key === "ArrowLeft" ? -1 : 1));
            }
        }}>
        <button type="button" className="archive-close" aria-label="Close archive viewer" onClick={() => dialog.current?.close()}>
          ×
        </button>
        {item.value && (<div className="archive-viewer-content">
            <div className="archive-viewer-media" style={{ aspectRatio: item.value.videoRatio ?? item.value.ratio, "--viewer-ratio": item.value.videoRatio ?? item.value.ratio }}>
              {item.value.embed && !item.value.previewOnly ? (<VideoEmbed key={item.value.id} src={item.value.embed} title={item.value.title || "Untitled artwork"} poster={item.value.image} activated ratio={item.value.videoRatio ?? item.value.ratio} compact/>) : (<SourceImage src={item.value.image} alt={item.value.title} eager className="h-full w-full object-contain"/>)}
            </div>
            <div className="my-5 flex justify-center gap-6">
              <button type="button" onClick={() => writeBox(info, !info.value)} aria-expanded={info.value} aria-controls="archive-info">
                info
              </button>
              <button type="button" onClick={() => select(index.value! - 1)} aria-label="Previous artwork">
                prev
              </button>
              <span>/</span>
              <button type="button" onClick={() => select(index.value! + 1)} aria-label="Next artwork">
                next
              </button>
            </div>
            <p id="archive-info" hidden={!info.value} className="text-center whitespace-pre-line">
              {item.value.title}
              {item.value.description ? `\n${item.value.description}` : ""}
            </p>
            {item.value.embed && !item.value.previewOnly && info.value && (<p className="text-center text-sm">
                <a href={item.value.embed} target="_blank" rel="noopener noreferrer">
                  Open original source ↗
                </a>
              </p>)}
          </div>)}
      </dialog>
    </section>);
}
