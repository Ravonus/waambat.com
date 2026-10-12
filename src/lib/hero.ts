import type { Artwork, Content } from "./content";

type Section = Content["sections"][number];
export const HERO_SECTION_ID = "site-hero";

export const HERO_VIDEO = "/hero/waambat-hero-desktop.mp4";
export const HERO_MOBILE_VIDEO = "/hero/waambat-hero-mobile.mp4";
export const HERO_LOOP = "/hero/waambat-hero-desktop-loop.mp4";
export const HERO_MOBILE_LOOP = "/hero/waambat-hero-mobile-loop.mp4";

// The banner shipped with the site: a Keel-rendered montage of her own works.
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
        title: "WAAMBAT hero montage",
        year: "",
        description:
          "A moving montage of WAAMBAT's own artworks, including LUX and Kismet Twist.",
        tokenLink: "/",
        videoSrc: HERO_VIDEO,
        mobileVideoSrc: HERO_MOBILE_VIDEO,
        loopSrc: HERO_LOOP,
        mobileLoopSrc: HERO_MOBILE_LOOP,
        previewSrc: "",
        poster: "/hero/waambat-hero-poster.webp",
        mobilePoster: "/hero/waambat-hero-poster-mobile.webp",
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

// Compatibility for content stored before the banner existed, or before it ended on a loop. Applied on
// read, never written back: the artist's ordinary Save persists it. An archived or edited hero is always
// respected: the default banner is only added when no hero exists, and only a banner that is still exactly
// the shipped one (its original video files, no loop of its own) gains the ending loop.
function gainsLoop(item: Artwork) {
  return (
    item.videoSrc === HERO_VIDEO &&
    item.mobileVideoSrc === HERO_MOBILE_VIDEO &&
    !item.loopSrc &&
    !item.mobileLoopSrc
  );
}
export function addDefaultHero(content: Content) {
  if (content.heroVersion >= 2) return { content, changed: false };
  const exists = content.sections.some(
    (section) =>
      section.id === HERO_SECTION_ID || section.presentation === "hero",
  );
  let upgraded = false;
  const sections = content.sections.map((section) => {
    if (section.presentation !== "hero" || section.archived) return section;
    if (!section.items.some((item) => !item.archived && gainsLoop(item)))
      return section;
    upgraded = true;
    return {
      ...section,
      items: section.items.map((item) =>
        !item.archived && gainsLoop(item)
          ? { ...item, loopSrc: HERO_LOOP, mobileLoopSrc: HERO_MOBILE_LOOP }
          : item,
      ),
    };
  });
  return {
    content: {
      ...content,
      heroVersion: 2 as const,
      sections: exists ? sections : [...sections, defaultHeroSection()],
    },
    changed: !exists || upgraded,
  };
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
