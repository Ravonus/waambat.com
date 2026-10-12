import type { Artwork, Content } from "./content";

// Exact public content players verified in the source browser: complete LUX
// Infinity #3 (moving facet textures) and Kismet #1 (750px circular canvas).
export const LUX_PLAYER =
  "https://ordinals.com/content/ce994e920942542babe215b0837704be9c73e9d08cdb8e6a818cf7767dbc7dcci2";
export const KISMET_PLAYER =
  "https://ordinals.com/content/60533f24d8b77bcc049f27d9853d185591ea4b81ffe51076cfd985f6f542ef9ai0";
const OLD_KISMET_PLAYER =
  "https://ordinals.com/preview/383773bbfe98f8fecef04f65c3bbf56fbdc044cb3cdeaf2eb546d140adac5162i98";
const OLD_KISMET_DESCRIPTION =
  "Explore the Kismet Twist collection on Satflow. The optional on-chain preview is Kismet Twist #100, attributed to WAAMBAT with Ravonus as technomancer in its inscription metadata.";

function correctedItem(section: string, item: Artwork): Artwork {
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

// Compatibility for already persisted pre-fix defaults. No storage write,
// revision replacement or seed fallback; ordinary authenticated Save persists
// the corrected draft, preserving the existing CAS/history workflow.
export function correctLegacyOrdinalSources(content: Content) {
  if (content.ordinalSourceVersion === 1) return { content, changed: false };
  let changed = false;
  const sections = content.sections.map((section) => {
    const items = section.items.map((item) => {
      const corrected = correctedItem(section.id, item);
      changed ||= corrected !== item;
      return corrected;
    });
    return { ...section, items };
  });
  return {
    content: { ...content, sections, ordinalSourceVersion: 1 as const },
    changed,
  };
}
