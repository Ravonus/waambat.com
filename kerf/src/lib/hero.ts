import {hero as heroAliases} from '../content/optimized-media.json';
import type { Artwork, Content } from "./content";

type Section = Content["sections"][number];
export const HERO_SECTION_ID = "site-hero";

export const HERO_VIDEO = "/hero/waambat-hero-desktop.mp4";
export const HERO_MOBILE_VIDEO = "/hero/waambat-hero-mobile.mp4";
export const HERO_LOOP = "/hero/waambat-hero-desktop-loop.mp4";
export const HERO_MOBILE_LOOP = "/hero/waambat-hero-mobile-loop.mp4";

// The default banner repeats the artist-selected self-portrait loop.
// Everything here is ordinary section/artwork content, so the studio edits it
// like any other item (placement, media, poster, titles, archiving).
export function defaultHeroSection(): Section {
  return {
    id: HERO_SECTION_ID,
    title: "waambat",
    intro: "",
    presentation: "hero",
    page: "nfts",
    archived: false,
    items: [
      {
        id: "site-hero-montage",
        title: "WAAMBAT hero loop",
        year: "",
        description:
          "A seamless loop of WAAMBAT's dark self-portrait.",
        tokenLink: "/",
        videoSrc: HERO_LOOP,
        mobileVideoSrc: HERO_MOBILE_LOOP,
        loopSrc: "",
        mobileLoopSrc: "",
        previewSrc: "",
        poster: "/hero/waambat-hero-loop-poster.webp",
        mobilePoster: "/hero/waambat-hero-loop-poster-mobile.webp",
        logoSrc: "",
        kind: "video",
        aspectRatio: 16 / 9,
        mobileAspectRatio: 4 / 5,
        featured: false,
        archived: false,
      },
    ],
  };
}

// Upgrade only the shipped montage. Custom sources, custom endings and archived
// entries remain the artist's choices; the stored document is never mutated.
const shippedSource=(value:string,source:string)=>value===source||value===(heroAliases as Record<string,string>)[source];
function shippedMontage(item: Artwork) {
  return shippedSource(item.videoSrc,HERO_VIDEO) && shippedSource(item.mobileVideoSrc,HERO_MOBILE_VIDEO) &&
    (!item.loopSrc || shippedSource(item.loopSrc,HERO_LOOP)) &&
    (!item.mobileLoopSrc || shippedSource(item.mobileLoopSrc,HERO_MOBILE_LOOP));
}
export function addDefaultHero(content: Content) {
  if (content.heroVersion >= 4) return { content, changed: false };
  const exists = content.sections.some(section => section.id === HERO_SECTION_ID || section.presentation === "hero");
  let upgraded = false;
  const sections = content.sections.map(section => {
    if (section.presentation !== "hero" || section.archived) return section;
    return {...section, items: section.items.map(item => {
      if (item.archived || !shippedMontage(item)) return item;
      upgraded = true;
      return {...item, videoSrc: HERO_LOOP, mobileVideoSrc: HERO_MOBILE_LOOP,
        loopSrc: "", mobileLoopSrc: "", poster: "/hero/waambat-hero-loop-poster.webp",
        mobilePoster: "/hero/waambat-hero-loop-poster-mobile.webp",
        title: item.title === "WAAMBAT hero montage" ? "WAAMBAT hero loop" : item.title};
    })};
  });
  return {content: {...content, heroVersion: 4 as const,
    sections: exists ? sections : [...sections, defaultHeroSection()]}, changed: !exists || upgraded};
}

export type ActiveHero = { section: Section; item: Artwork };

// The first live hero banner for a page, or null when none is enabled or it has
// neither a video nor a poster to show.
export function activeHero(content: Content, page: string): ActiveHero | null {
  for (const section of content.sections) {
    if (
      section.presentation !== "hero" ||
      section.archived ||
      section.page !== page ||
      content.pages.find((p) => p.slug === page)?.archived
    )
      continue;
    const item = section.items.find(
      (candidate) =>
        !candidate.archived &&
        candidate.kind === "video" &&
        (candidate.videoSrc || candidate.poster),
    );
    if (item) return { section, item };
  }
  return null;
}
