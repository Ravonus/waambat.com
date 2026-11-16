import { state, derived } from "@kerf-js/core";
import { update as writeBox } from "#/lib/reactive";
import type { SitePage } from "~/lib/content";
import { archiveGroups } from "~/lib/archive-layout";
import SourceImage from "./SourceImage";
import MediaViewer from "./MediaViewer";
import InlineVideo from "./InlineVideo";
import { MediaIcon } from "./MediaControls";
import ArchivePreview from './ArchivePreview';
export default function Archive({ items }: {
    items: SitePage["archive"];
}) {
    const visible = derived(() => items.filter((i) => !i.archived));
    const viewable = derived(() => visible.value.filter((i) => !i.previewOnly));
    const selected = state<number | null>(null);
    const viewerItems = derived(() => viewable.value.map(art => ({
        id: art.id,
        title: art.title || "Untitled artwork",
        description: art.description,
        video: art.embed,
        image: art.image,
        ratio: art.videoRatio ?? art.ratio,
        sourceHref: art.embed,
    })));
    const select = (next: number) => writeBox(selected, next);
    return (<section aria-label="Art archive" className="pb-16">
      <div className="archive-montage">
        {archiveGroups(visible.value).map((row) => (<div key={row[0]!.id} className="archive-row">
            {row.map((art) => (<div key={art.id} className="archive-tile" style={{ '--artwork-ratio': art.ratio }} data-archive-artwork={art.id}>
                {art.previewOnly ? <ArchivePreview art={art} priority={art.id===visible.value[0]?.id}/> : art.embed ? (<InlineVideo key={art.embed} src={art.embed} poster={art.image} title={art.title || "Untitled artwork"} priority={art.id===visible.value[0]?.id} suspended={selected.value !== null}/>) : (<SourceImage src={art.image} alt="" eager={art.id===visible.value[0]?.id} sizes="(max-width: 767px) calc(100vw - 40px), 1100px" className="h-full w-full object-contain"/>)}
                {!art.previewOnly && <button type="button" className="media-control archive-expand" onClick={() => select(viewable.value.indexOf(art))} aria-label={`View ${art.title || "untitled artwork"}`} title="Open fullscreen viewer">
                  <MediaIcon kind="expand"/>
                </button>}
                {!art.previewOnly && art.title && (<div className="archive-caption">{art.title}</div>)}
              </div>))}
          </div>))}
      </div>
      <MediaViewer items={viewerItems.value} selection={selected} id="archive"
        label="Archive artwork viewer" closeLabel="Close archive viewer"/>
    </section>);
}
