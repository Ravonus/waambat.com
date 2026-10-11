import { z } from "zod";
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (s) => !/<[!/?a-z]|[\u0000-\u0008]/i.test(s),
      "Use plain text, without HTML",
    );
export const safeLink = z
  .string()
  .max(2048)
  .refine((value) => {
    if (/^\/(?!\/)[a-zA-Z0-9/_?.=&%-]*$/.test(value)) return true;
    try {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Use an HTTPS URL or a local path");
export const mediaLink = z.union([z.literal(""), safeLink]);
export const artworkSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,80}$/),
    title: text(160).refine((s) => s.length > 0, "A title is required"),
    year: text(80),
    description: text(2000),
    tokenLink: safeLink,
    videoSrc: mediaLink,
    poster: mediaLink,
    mobileVideoSrc: mediaLink.default(""),
    kind: z.enum(["video", "image", "link"]).default("video"),
    archived: z.boolean().default(false),
  })
  .strict()
  .superRefine((item, ctx) => {
    if (item.kind === "video" && (!item.videoSrc || !item.poster))
      ctx.addIssue({
        code: "custom",
        message: "Videos need both a source and a poster",
      });
    if (item.kind === "image" && !item.poster)
      ctx.addIssue({ code: "custom", message: "Images need an image URL" });
  });
export const sectionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,80}$/),
    title: text(120).refine((s) => s.length > 0, "A title is required"),
    intro: text(2000),
    page: z.enum(["nfts", "ordinals"]),
    archived: z.boolean().default(false),
    items: z.array(artworkSchema).max(100),
  })
  .strict();
export const pageSlugs = [
  "mechanics",
  "art-by-waambat",
  "blog-press",
  "bio-waambat",
  "contact-waambat",
  "waambat",
  "lindsay-scoggins",
  "art",
  "nfts-copy",
] as const;
export const embedLink = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      ((url.hostname === "www.youtube-nocookie.com" &&
        /^\/embed\/[A-Za-z0-9_-]{11}$/.test(url.pathname)) ||
        (url.hostname === "player.vimeo.com" &&
          /^\/video\/\d{1,15}$/.test(url.pathname)))
    );
  } catch {
    return false;
  }
}, "Use a verified YouTube privacy embed or Vimeo player URL");
export const pageBlockSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,80}$/),
    type: z.enum([
      "heading",
      "paragraph",
      "image",
      "embed",
      "separator",
      "list",
    ]),
    text: text(12000).default(""),
    href: mediaLink.default(""),
    src: mediaLink.default(""),
    level: z.number().int().min(1).max(3).default(2),
    items: z
      .array(
        z.object({ text: text(500), href: mediaLink.default("") }).strict(),
      )
      .max(50)
      .default([]),
    links: z
      .array(z.object({ text: text(500), href: safeLink }).strict())
      .max(30)
      .default([]),
    archived: z.boolean().default(false),
  })
  .strict()
  .superRefine((block, ctx) => {
    if (block.type === "image" && !block.src)
      ctx.addIssue({ code: "custom", message: "Images need a source URL" });
    if (block.type === "embed" && !embedLink.safeParse(block.src).success)
      ctx.addIssue({
        code: "custom",
        message: "Embed source must be an approved player URL",
      });
  });
export const archiveItemSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,80}$/),
    title: text(200),
    image: safeLink,
    description: text(2000).default(""),
    embed: z.union([z.literal(""), embedLink]).default(""),
    archived: z.boolean().default(false),
  })
  .strict();
export const pageSchema = z
  .object({
    slug: z.enum(pageSlugs),
    title: text(160),
    layout: z.enum(["article", "archive"]).default("article"),
    blocks: z.array(pageBlockSchema).max(250),
    archive: z.array(archiveItemSchema).max(100).default([]),
  })
  .strict();
export type SitePage = z.infer<typeof pageSchema>;
export type PageBlock = z.infer<typeof pageBlockSchema>;
export const contentSchema = z
  .object({
    sections: z.array(sectionSchema).min(1).max(30),
    pages: z.array(pageSchema).max(pageSlugs.length).default([]),
  })
  .strict()
  .superRefine((doc, ctx) => {
    const ids = doc.sections.flatMap((s) => [
      s.id,
      ...s.items.map((i) => i.id),
    ]);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        message: "Every section and artwork must have a unique ID",
      });
    if (new Set(doc.pages.map((p) => p.slug)).size !== doc.pages.length)
      ctx.addIssue({ code: "custom", message: "Page slugs must be unique" });
    for (const page of doc.pages) {
      const blockIds = [
        ...page.blocks.map((b) => b.id),
        ...page.archive.map((a) => a.id),
      ];
      if (new Set(blockIds).size !== blockIds.length)
        ctx.addIssue({
          code: "custom",
          message: "Page block IDs must be unique",
        });
    }
  });
export type Artwork = z.infer<typeof artworkSchema>;
export type Content = z.infer<typeof contentSchema>;
export const saveSchema = z
  .object({
    revision: z.string().regex(/^[a-f0-9]{40}$/),
    publishedRevision: z
      .string()
      .regex(/^[a-f0-9]{40}$/)
      .optional(),
    action: z.enum(["save", "publish"]),
    content: contentSchema.optional(),
  })
  .strict();
export function mediaReferences(content: Content) {
  return new Set([
    ...content.sections
      .filter((s) => !s.archived)
      .flatMap((s) =>
        s.items
          .filter((i) => !i.archived)
          .flatMap((i) => [i.videoSrc, i.mobileVideoSrc, i.poster]),
      ),
    ...content.pages.flatMap((p) => [
      ...p.blocks.filter((b) => !b.archived).map((b) => b.src),
      ...p.archive.filter((a) => !a.archived).map((a) => a.image),
    ]),
  ]);
}
