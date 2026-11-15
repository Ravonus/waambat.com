import type { Content } from "./content";

// These are the same named paintings, already acquired and verified from the
// artist's NFT page. Exact legacy URLs only: an artist's replacement stays theirs.
const recovered: Record<string, string> = {
  "https://player.vimeo.com/video/538169390?app_id=122963&wmode=opaque":
    "https://i.imgur.com/7ouIHyN.mp4",
  "https://player.vimeo.com/video/543748855?app_id=122963&wmode=opaque":
    "https://i.imgur.com/b8XNIJY.mp4",
};

// The owner chose to remove these unavailable films from the public archive.
// Retain their records in admin, rather than deleting artwork history or assets.
const retired = new Set([
  "https://player.vimeo.com/video/224251774?app_id=122963&wmode=opaque",
  "https://player.vimeo.com/video/198626504?app_id=122963&wmode=opaque",
  "https://player.vimeo.com/video/198626531?app_id=122963&wmode=opaque",
  "https://player.vimeo.com/video/198626554?app_id=122963&wmode=opaque",
  "https://player.vimeo.com/video/198626259?app_id=122963&wmode=opaque",
  "https://player.vimeo.com/video/198626656?app_id=122963&wmode=opaque",
  "https://player.vimeo.com/video/198626597?app_id=122963&wmode=opaque",
  "https://player.vimeo.com/video/198626569?app_id=122963&wmode=opaque",
  "https://player.vimeo.com/video/130840561?app_id=122963&wmode=opaque",
  "https://player.vimeo.com/video/198626629?app_id=122963&wmode=opaque",
  "https://www.youtube.com/embed/mkIoJZdKIAE?feature=oembed",
  "https://www.youtube.com/embed/-aGTNS13SDU?feature=oembed",
  "https://www.youtube.com/embed/sp8J4WBW8TY?feature=oembed",
]);

/** Recover available paintings and retire the unavailable archive sources the owner removed. */
export function recoverArchiveSources(content: Content) {
  if (content.archiveSourceVersion >= 1) return { content, changed: false };
  const pages = content.pages.map((page) => {
    let updated = false;
    const blocks = page.blocks.map((block) => {
      if (block.src !== "https://i.imgur.com/3hhNUKR.mp4" || block.archived) return block;
      updated = true;
      return { ...block, archived: true };
    });
    const archive = page.archive.map((art) => {
      if (!art.archived && retired.has(art.embed)) {
        updated = true;
        return { ...art, archived: true };
      }
      const replacement = recovered[art.embed];
      if (!replacement) return art;
      updated = true;
      return { ...art, embed: replacement };
    });
    return updated ? { ...page, archive, blocks } : page;
  });
  return { content: { ...content, pages, archiveSourceVersion: 1 }, changed: true };
}
