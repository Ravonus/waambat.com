import { state, derived, onMount, watch, onCleanup } from "@kerf-js/core";
import { update as writeBox } from "#/lib/reactive";
import type { Content } from "~/lib/content";
import ArtworkCard from "./ArtworkCard";
import { isOrdinalPiece } from "~/lib/ordinal-page";
import OrdinalCollection from "./OrdinalCollection";
import {activeHero} from '#/lib/hero';
export default function Gallery({ content, page, }: {
    content: Pick<Content, 'sections'>;
    page: string;
}) {
    const sections = derived(() => content.sections
        .filter((s) => s.page === page && !s.archived && s.presentation !== "hero")
        .sort((a, b) => Number(b.presentation === "trailer") -
        Number(a.presentation === "trailer")));
    const hasHero = derived(() => !!activeHero(content, page));
    // The Ordinals page is its own layout: the live pieces, then the early GIF inscriptions.
    const pieces = derived(() => page === "ordinals" ? sections.value.filter(isOrdinalPiece) : []);
    const early = derived(() => page === "ordinals" ? sections.value.find((s) => s.id === "ordinals") : undefined);
    const claimed = derived(() => new Set([...pieces.value, ...(early.value ? [early.value] : [])]));
    function render(section: Content["sections"][number], compact = false) {
        return (<section key={section.id} aria-label={section.title} className={page === "nfts" ? "original-home pb-10" : "pb-10"}>
        {section.presentation !== "trailer" &&
                !["nfts", "ordinals"].includes(section.id) && (<h1 className="text-waambat-pink mt-10 mb-5 text-center text-3xl">
              {section.title}
            </h1>)}
        {section.intro &&
                (page === "nfts" ? (<p className="home-intro text-center font-bold">{section.intro}</p>) : (<p className="mb-10 text-center">{section.intro}</p>))}
        <div className={compact
                ? "flex flex-col"
                : page === "nfts"
                    ? "flex flex-col"
                    : "flex flex-col"}>
          {section.items
                .filter((a) => !a.archived)
                .sort((a, b) => Number(b.featured) - Number(a.featured))
                .map((a, index) => (<ArtworkCard key={a.id} artwork={a} priority={!hasHero.value && section.id === sections.value[0]?.id && index === 0} originalFlow={page === "nfts" && section.presentation !== "trailer"} trailer={section.presentation === "trailer"} ratio={a.aspectRatio ??
                    (section.presentation === "trailer" ? 16 / 9 : undefined)}/>))}
        </div>
      </section>);
    }
    return (<>
      {page === "ordinals" && (<OrdinalCollection title={early.value?.title ?? "ORDINALS"} pieces={pieces.value} early={early.value}/>)}
      {sections.value.filter((s) => !claimed.value.has(s)).map((s) => render(s))}
    </>);
}
