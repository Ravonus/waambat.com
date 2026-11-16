import { derived, onMount, state, watch, type State } from "@kerf-js/core";
import { playbackAsset } from "#/lib/local-media";
import SourceImage from "./SourceImage";
import VideoEmbed from "./VideoEmbed";

export type MediaViewerItem = {
  id: string;
  title: string;
  description?: string;
  video?: string;
  image?: string;
  ratio?: number;
  sourceHref?: string;
};

/** The shared fullscreen artwork viewer; the caller owns selection and inline playback suspension. */
export default function MediaViewer({ items, selection, id, label, closeLabel }: {
  items: MediaViewerItem[];
  selection: State<number | null>;
  id: string;
  label: string;
  closeLabel: string;
}) {
  let dialog: HTMLDialogElement | undefined;
  const info = state(false);
  const index = derived(() => selection.value === null || !items.length
    ? null : Math.max(0, Math.min(selection.value, items.length - 1)));
  const item = derived(() => index.value === null ? undefined : items[index.value]);
  const asset = derived(() => playbackAsset(item.value?.video ?? ""));
  const ratio = derived(() => item.value?.ratio ??
    (asset.value ? asset.value.width / asset.value.height : 16 / 9));
  const select = (next: number) => {
    if (!items.length) return;
    info.value = false;
    selection.value = (next + items.length) % items.length;
  };
  onMount(() => watch(() => !!item.value, open => {
    if (!dialog) return;
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }));
  return (
    <dialog ref={node => { dialog = node; }} className="archive-viewer"
      data-media-viewer={id} aria-label={label}
      onClose={() => { selection.value = null; info.value = false; }}
      onKeyDown={event => {
        if (index.value !== null && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
          event.preventDefault();
          select(index.value + (event.key === "ArrowLeft" ? -1 : 1));
        }
      }}>
      <button type="button" className="archive-close" aria-label={closeLabel}
        onClick={() => dialog?.close()}>×</button>
      {!!item.value && <div className="archive-viewer-content">
        <div className="archive-viewer-media"
          style={{ aspectRatio: ratio.value, "--viewer-ratio": ratio.value }}>
          {item.value?.video
            ? <VideoEmbed key={item.value?.id} src={item.value?.video ?? ""} title={item.value?.title ?? ""}
                poster={item.value?.image ?? ""} activated ratio={ratio.value} compact />
            : <SourceImage src={item.value?.image ?? ""} alt={item.value?.title ?? ""} eager
                className="h-full w-full object-contain" />}
        </div>
        <div className="my-5 flex justify-center gap-6">
          <button type="button" onClick={() => { info.value = !info.value; }}
            aria-expanded={info.value} aria-controls={`${id}-info`}>info</button>
          <button type="button" onClick={() => select(index.value! - 1)} aria-label="Previous artwork">prev</button>
          <span>/</span>
          <button type="button" onClick={() => select(index.value! + 1)} aria-label="Next artwork">next</button>
        </div>
        <p id={`${id}-info`} hidden={!info.value} className="text-center whitespace-pre-line">
          {item.value?.title}{item.value?.description ? `\n${item.value.description}` : ""}
        </p>
        {item.value?.sourceHref && info.value && <p className="text-center text-sm">
          <a href={item.value?.sourceHref} target="_blank" rel="noopener noreferrer">Open original source ↗</a>
        </p>}
      </div>}
    </dialog>
  );
}
