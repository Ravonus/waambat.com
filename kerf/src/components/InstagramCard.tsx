import { state, derived, onMount, watch, onCleanup } from "@kerf-js/core";
import { update as writeBox } from "#/lib/reactive";
import type { Artwork } from "~/lib/content";
import { instagramTarget } from "~/lib/instagram";
import SourceImage from "./SourceImage";
export default function InstagramCard({ artwork }: {
    artwork: Artwork;
}) {
    const target = derived(() => instagramTarget(artwork.tokenLink));
    const container = { current: null as HTMLElement | null | undefined };
    const dismissed = { current: null as (string | null) | null | undefined };
    const loadedSource = state<string | null>(null);
    const failedSource = state<string | null>(null);
    const loaded = derived(() => loadedSource.value === artwork.tokenLink);
    const failed = derived(() => failedSource.value === artwork.tokenLink);
    onMount(() => watch(() => [artwork.tokenLink], () => {
        const element = container.current;
        if (!element || !instagramTarget(artwork.tokenLink)?.embed)
            return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry?.isIntersecting && dismissed.current !== artwork.tokenLink)
                writeBox(loadedSource, artwork.tokenLink);
        }, { threshold: 0.01 });
        observer.observe(element);
        return () => observer.disconnect();
    }));
    const label = derived(() => artwork.title || `Instagram ${target.value!.type}`);
    return <>{!target.value ? null : (<article ref={node => {
            container.current = node;
        }} data-instagram={artwork.id} className="mb-10 min-h-[540px] text-center">
      {artwork.featured && (<p className="text-waambat-pink mb-3 text-xs">Featured</p>)}
      {artwork.poster && !loaded.value && (<a href={target.value.canonical} target="_blank" rel="noopener noreferrer">
          <SourceImage src={artwork.poster} alt={label.value} className="mb-4 aspect-square w-full object-contain"/>
        </a>)}
      {artwork.title && (<h2 className="text-waambat-pink mb-3 text-[22px]">{artwork.title}</h2>)}
      {artwork.description && (<p className="mb-4 whitespace-pre-line">{artwork.description}</p>)}
      {loaded.value && target.value!.embed && !failed.value ? (<>
          <iframe src={target.value!.embed} title={label.value} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" allow="fullscreen" className="mx-auto mb-4 block h-[540px] w-full max-w-[500px] border-0 bg-black" onError={() => {
                writeBox(failedSource, artwork.tokenLink);
                dismissed.current = artwork.tokenLink;
                writeBox(loadedSource, null);
            }}/>
          <button type="button" onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                dismissed.current = artwork.tokenLink;
                writeBox(loadedSource, null);
            }} className="mx-auto mb-3 block text-xs underline">
            Close Instagram preview
          </button>
        </>) : target.value!.embed && !failed.value ? (<p className="text-sm text-white/65">
          Instagram preview loads when visible.
        </p>) : (<p className="mb-3 text-sm text-white/65">
          {target.value!.type === "highlight"
                ? "Highlights open on Instagram."
                : "The preview is unavailable. Open the original on Instagram."}
        </p>)}
      <a href={target.value.canonical} target="_blank" rel="noopener noreferrer" className="text-waambat-link inline-block">
        View on Instagram ↗
      </a>
      <p className="mt-3 text-xs text-white/65">
        If a post is private, deleted or unavailable, this original link remains
        here.
      </p>
    </article>)}</>;
}
