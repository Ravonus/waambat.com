import { state, derived, onMount, watch, onCleanup } from "@kerf-js/core";
import { update as writeBox } from "#/lib/reactive";
import type { SitePage } from "~/lib/content";
import { archiveRows } from "~/lib/archive-layout";
import SourceImage from "./SourceImage";
import VideoEmbed from "./VideoEmbed";
import InlineVideo from "./InlineVideo";
import { MediaIcon } from "./MediaControls";
export default function Archive({ items }: {
    items: SitePage["archive"];
}) {
    const visible = derived(() => items.filter((i) => !i.archived));
    const container = { current: null as HTMLDivElement | null | undefined };
    const dialog = { current: null as HTMLDialogElement | null | undefined };
    const width = state(1392);
    const gap = state(10);
    const selected = state<number | null>(null);
    const info = state(false);
    onMount(() => watch(() => [], () => {
        const el = container.current;
        if (!el)
            return;
        const observer = new ResizeObserver(() => {
            writeBox(width, el.clientWidth);
            writeBox(gap, parseFloat(getComputedStyle(el).getPropertyValue("--site-archive-gap")) || 10);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }));
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
    const index = derived(() => selected.value === null ? null : Math.min(selected.value, visible.value.length - 1));
    const item = derived(() => index.value === null ? undefined : visible.value[index.value]);
    const select = (next: number) => {
        writeBox(info, false);
        writeBox(selected, (next + visible.value.length) % visible.value.length);
    };
    return (<section aria-label="Art archive" className="pb-16">
      <div ref={node => {
            container.current = node;
        }} className="archive-montage">
        {archiveRows(visible.value, width.value, gap.value).map((row) => (<div key={row.items[0]!.id} className="archive-row" style={{ height: row.height, gap }}>
            {row.items.map((art) => (<div key={art.id} className="archive-tile" style={{ flexGrow: art.ratio }} data-archive-artwork={art.id}>
                {art.embed ? (<InlineVideo key={art.embed} src={art.embed} poster={art.image} title={art.title || "Untitled artwork"} suspended={selected.value !== null}/>) : (<SourceImage src={art.image} alt="" sizes="(max-width: 767px) calc(100vw - 40px), 1100px" className="h-full w-full object-contain"/>)}
                <button type="button" className="media-control archive-expand" onClick={() => select(visible.value.indexOf(art))} aria-label={`View ${art.title || "untitled artwork"}`} title="Open fullscreen viewer">
                  <MediaIcon kind="expand"/>
                </button>
                {art.title && (<div className="archive-caption">{art.title}</div>)}
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
              {item.value.embed ? (<VideoEmbed key={item.value.id} src={item.value.embed} title={item.value.title || "Untitled artwork"} poster={item.value.image} activated ratio={item.value.videoRatio ?? item.value.ratio} compact/>) : (<SourceImage src={item.value.image} alt={item.value.title} eager className="h-full w-full object-contain"/>)}
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
            {item.value.embed && info.value && (<p className="text-center text-sm">
                <a href={item.value.embed} target="_blank" rel="noopener noreferrer">
                  Open original source ↗
                </a>
              </p>)}
          </div>)}
      </dialog>
    </section>);
}
