import type { Artwork, Content } from "./content";

// Exact public content players verified in the source browser: complete LUX
// Infinity #3 (moving facet textures) and Kismet #1 (750px circular canvas).
export const LUX_PLAYER =
  "https://ordinals.com/content/ce994e920942542babe215b0837704be9c73e9d08cdb8e6a818cf7767dbc7dcci2";
export const KISMET_PLAYER =
  "https://ordinals.com/content/60533f24d8b77bcc049f27d9853d185591ea4b81ffe51076cfd985f6f542ef9ai0";
export const GAMMA_PLAYER =
  "https://ordinals.com/content/2d284790a8ecddb0f4aa21e7763e0e499fdb068e79f398ad268dda7fcb3eabfei0";
const GAMMA_PAGE =
  "https://gamma.io/ordinals/inscriptions/2d284790a8ecddb0f4aa21e7763e0e499fdb068e79f398ad268dda7fcb3eabfei0";
// Cached loops of the three live pieces and their first-frame posters, content-hashed so the CDN keeps
// them forever (public/previews; keel/hero/encode-ordinal-previews.sh renders them from the live pieces).
export const PREVIEWS = {
  lux: {
    loop: "/previews/lux-9b87c251ff.mp4",
    poster: "/previews/lux-43c6cf7659.webp",
  },
  kismet: {
    loop: "/previews/kismet-3c8c06ebe1.mp4",
    poster: "/previews/kismet-e2dfe19111.webp",
  },
  gamma: {
    loop: "/previews/gamma-02b3d18c54.mp4",
    poster: "/previews/gamma-8ebd8126c1.webp",
  },
} as const;
const V1_LUX_DESCRIPTION =
  "Live full LUX · Infinity #3. Explore the collection on Satflow.";
const V1_KISMET_DESCRIPTION =
  "Live Kismet Twist #1. Explore the collection on Satflow.";
// Only LUX is interactive. Kismet Twist and Edge Corporeal are videos (their inscriptions script an
// encoded video), so their cached loop is the artwork and there is nothing to take control of. A piece
// without any cached loop still opens live, since there is nothing else to show.
export const INTERACTIVE_PLAYERS: ReadonlySet<string> = new Set([LUX_PLAYER]);
export const opensLive = (player: string, hasLoop: boolean) =>
  !!player && (INTERACTIVE_PLAYERS.has(player) || !hasLoop);

// How long after its document loads a live piece needs before it is worth showing. LUX draws its own
// loader for about five and a half seconds (measured: the frame goes from a 5 KB spinner to a 190 KB
// image at 5.5 s, cold or warm), so its cached loop stays up until then; the others draw at once.
export const LIVE_SETTLE_MS: Record<string, number> = { [LUX_PLAYER]: 6500 };
export const DEFAULT_LIVE_SETTLE_MS = 600;
const LEGACY_LUX_POSTER = "https://whitepaper.terminus.art/images/lux3.webp";
const OLD_GAMMA_DESCRIPTION =
  "Open the supplied individual artwork destination. Title and preview metadata have not been verified.";
const OLD_KISMET_PLAYER =
  "https://ordinals.com/preview/383773bbfe98f8fecef04f65c3bbf56fbdc044cb3cdeaf2eb546d140adac5162i98";
const OLD_KISMET_DESCRIPTION =
  "Explore the Kismet Twist collection on Satflow. The optional on-chain preview is Kismet Twist #100, attributed to WAAMBAT with Ravonus as technomancer in its inscription metadata.";

function correctedV1(section: string, item: Artwork): Artwork {
  // Upgrade only the exact legacy defaults. Artist-selected media, captions,
  // ratios and archival decisions remain authoritative.
  if (
    section === "lux" &&
    item.id === "lux-ok-algo" &&
    item.kind === "image" &&
    item.videoSrc === "" &&
    item.mobileVideoSrc === "" &&
    item.poster === "https://whitepaper.terminus.art/images/lux3.webp" &&
    item.tokenLink === "https://www.satflow.com/ordinals/lux_ok_algo" &&
    item.title === "LUX · OK ALGO" &&
    item.description === "The OK Algo facet · Explore LUX on Satflow"
  )
    return {
      ...item,
      kind: "embed",
      videoSrc: LUX_PLAYER,
      description:
        "Live full LUX · Infinity #3. Explore the collection on Satflow.",
      aspectRatio: item.aspectRatio ?? 1,
    };
  if (
    section === "kismet-twist" &&
    item.id === "kismet-twist-collection" &&
    item.kind === "embed" &&
    item.videoSrc === OLD_KISMET_PLAYER &&
    item.mobileVideoSrc === "" &&
    item.poster === "" &&
    item.tokenLink === "https://www.satflow.com/ordinals/kismettwist" &&
    item.title === "Kismet Twist" &&
    item.description === OLD_KISMET_DESCRIPTION
  )
    return {
      ...item,
      videoSrc: KISMET_PLAYER,
      description: "Live Kismet Twist #1. Explore the collection on Satflow.",
      aspectRatio: item.aspectRatio ?? 1,
    };
  return item;
}

// Version 2: the cached loops, and the Gamma artwork as a live piece. Same rule: only exact legacy
// defaults change; a loop is added only where none is set, and a poster only where it is the legacy
// default or empty.
function correctedV2(section: string, item: Artwork): Artwork {
  const piece =
    section === "lux" && item.id === "lux-ok-algo"
      ? ([LUX_PLAYER, PREVIEWS.lux] as const)
      : section === "kismet-twist" && item.id === "kismet-twist-collection"
        ? ([KISMET_PLAYER, PREVIEWS.kismet] as const)
        : null;
  if (
    piece &&
    item.kind === "embed" &&
    item.videoSrc === piece[0] &&
    item.previewSrc === ""
  )
    return {
      ...item,
      previewSrc: piece[1].loop,
      poster:
        item.poster === "" || item.poster === LEGACY_LUX_POSTER
          ? piece[1].poster
          : item.poster,
      // The page now shows a cached loop first and the live piece on request, and the
      // marketplace link sits beneath it, so the caption just names the artwork.
      description:
        item.description === V1_LUX_DESCRIPTION
          ? "Infinity #3 · the OK Algo facet."
          : item.description === V1_KISMET_DESCRIPTION
            ? "Kismet Twist #1."
            : item.description,
    };
  // Edge Corporeal: the title, artist and technomancer are in the inscription's own metadata.
  if (
    section === "gamma-artwork" &&
    item.id === "gamma-user-artwork" &&
    item.kind === "link" &&
    item.videoSrc === "" &&
    item.mobileVideoSrc === "" &&
    item.previewSrc === "" &&
    item.poster === "" &&
    item.tokenLink === GAMMA_PAGE &&
    item.title === "View artwork on Gamma" &&
    item.description === OLD_GAMMA_DESCRIPTION
  )
    return {
      ...item,
      kind: "embed",
      title: "Edge Corporeal",
      description:
        "Edge Corporeal by WAAMBAT, with Ravonus as technomancer, inscribed on Bitcoin.",
      videoSrc: GAMMA_PLAYER,
      previewSrc: PREVIEWS.gamma.loop,
      poster: PREVIEWS.gamma.poster,
      aspectRatio: item.aspectRatio ?? 1,
    };
  return item;
}

function correctedItem(
  section: string,
  item: Artwork,
  version: number,
): Artwork {
  return correctedV2(section, version < 1 ? correctedV1(section, item) : item);
}

// Compatibility for already persisted pre-fix defaults. No storage write,
// revision replacement or seed fallback; ordinary authenticated Save persists
// the corrected draft, preserving the existing CAS/history workflow.
export function correctLegacyOrdinalSources(content: Content) {
  if (content.ordinalSourceVersion >= 2) return { content, changed: false };
  let changed = false;
  const sections = content.sections.map((section) => {
    const items = section.items.map((item) => {
      const corrected = correctedItem(
        section.id,
        item,
        content.ordinalSourceVersion,
      );
      changed ||= corrected !== item;
      return corrected;
    });
    return { ...section, items };
  });
  return {
    content: { ...content, sections, ordinalSourceVersion: 2 },
    changed,
  };
}
