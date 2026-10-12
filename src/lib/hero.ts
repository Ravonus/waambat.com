import type { Artwork, Content } from "./content";

type Section = Content["sections"][number];
export const HERO_SECTION_ID = "site-hero";

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
        videoSrc: "/hero/waambat-hero-desktop.mp4",
        mobileVideoSrc: "/hero/waambat-hero-mobile.mp4",
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

// Compatibility for content stored before the banner existed. Applied on read,
// never written back: the artist's ordinary Save persists it, and an archived
// or edited hero is always respected (it is only added when no hero exists).
export function addDefaultHero(content: Content) {
  if (content.heroVersion === 1) return { content, changed: false };
  const exists = content.sections.some(
    (section) =>
      section.id === HERO_SECTION_ID || section.presentation === "hero",
  );
  return {
    content: {
      ...content,
      heroVersion: 1 as const,
      sections: exists
        ? content.sections
        : [...content.sections, defaultHeroSection()],
    },
    changed: !exists,
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
