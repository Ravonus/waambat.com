import type { Content } from "./content";
import { videoSource } from "./video-source";

type Section = Content["sections"][number];
type Item = Section["items"][number];

// A live Ordinals piece: a provider-hosted inscription (or one with a cached loop), alongside any
// resource links in the same section. A section with anything else in it keeps the ordinary layout.
export const isPiece = (item: Item) =>
  item.kind === "embed" &&
  (videoSource(item.videoSrc)?.provider === "ordinals" || !!item.previewSrc);

export function isOrdinalPiece(section: Section) {
  const items = section.items.filter((item) => !item.archived);
  return (
    section.id !== "ordinals" &&
    items.some(isPiece) &&
    items.every((item) => isPiece(item) || item.kind === "link")
  );
}

const MARKETS: Record<string, string> = {
  "satflow.com": "Satflow",
  "gamma.io": "Gamma",
};
export function marketplace(link: string) {
  try {
    const host = new URL(link).hostname.replace(/^www\./, "");
    return MARKETS[host] ?? host;
  } catch {
    return "";
  }
}

// The inscription's own page on ordinals.com, from its content or preview URL.
export function inscriptionPage(player: string) {
  const id = player.match(
    /^https:\/\/ordinals\.com\/(?:content|preview)\/([a-f0-9]{64}i\d{1,12})$/,
  )?.[1];
  return id ? `https://ordinals.com/inscription/${id}` : "";
}
