import { z } from "zod";
import { instagramTarget } from "./instagram";
import { videoSource } from "./video-source";
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
    // Exact recovered historical destinations; do not widen media/provider rules.
    if (
      [
        "http://www.adelaandea.com/reviews/2012/ArtWynwood.html",
        "http://instagram.com/waambat",
        "mailto:studiowaambat@gmail.com",
      ].includes(value)
    )
      return true;
    try {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Use an HTTPS URL, local path or a recovered historical destination");
export const mediaLink = z.union([z.literal(""), safeLink]);
export const artworkSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,80}$/),
    title: text(160),
    year: text(80),
    description: text(2000),
    tokenLink: safeLink,
    videoSrc: mediaLink,
    poster: mediaLink,
    mobileVideoSrc: mediaLink.default(""),
    kind: z
      .enum(["video", "image", "link", "instagram", "embed"])
      .default("video"),
    featured: z.boolean().default(false),
    archived: z.boolean().default(false),
  })
  .strict()
  .superRefine((item, ctx) => {
    if (item.kind !== "instagram" && !item.title)
      ctx.addIssue({ code: "custom", message: "A title is required" });
    if (item.kind === "instagram" && !instagramTarget(item.tokenLink))
      ctx.addIssue({
        code: "custom",
        message: "Use an Instagram post, reel or highlight URL",
      });
    if (item.kind === "video" && (!item.videoSrc || !item.poster))
      ctx.addIssue({
        code: "custom",
        message: "Videos need both a source and a poster",
      });
    if (item.kind === "embed" && !videoSource(item.videoSrc))
      ctx.addIssue({
        code: "custom",
        message: "Use an approved video-provider URL",
      });
    if (
      item.kind === "video" &&
      (!videoSource(item.videoSrc)?.direct ||
        (item.mobileVideoSrc && !videoSource(item.mobileVideoSrc)?.direct))
    )
      ctx.addIssue({
        code: "custom",
        message: "Use a direct HTTPS MP4/WebM or uploaded media URL",
      });
    if (item.kind === "image" && !item.poster)
      ctx.addIssue({ code: "custom", message: "Images need an image URL" });
  });
export const sectionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,80}$/),
    title: text(120).refine((s) => s.length > 0, "A title is required"),
    intro: text(2000),
    page: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(80),
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
  "instagram",
  "waambat",
  "lindsay-scoggins",
  "art",
  "nfts-copy",
] as const;
export const pageSlug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80)
  .refine(
    (s) =>
      ![
        "admin",
        "api",
        "ordinals",
        "nfts",
        "favicon",
        "robots",
        "sitemap",
        "nfts-copy",
      ].includes(s),
    "Choose a unique page slug outside reserved routes",
  );
export const defaultNavigation = [
  { id: "nfts", label: "NFTs", href: "/", archived: false },
  { id: "ordinals", label: "ORDINALS", href: "/ordinals", archived: false },
  {
    id: "mechanics",
    label: "quantum mechanics",
    href: "/mechanics",
    archived: false,
  },
  {
    id: "archive",
    label: "art archive",
    href: "/art-by-waambat",
    archived: false,
  },
  { id: "instagram", label: "instagram", href: "/instagram", archived: false },
  { id: "press", label: "blog + press", href: "/blog-press", archived: false },
  { id: "bio", label: "bio", href: "/bio-waambat", archived: false },
  {
    id: "contact",
    label: "collect + contact",
    href: "/contact-waambat",
    archived: false,
  },
];
export const navigationSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,80}$/),
    label: text(120).refine((s) => s.length > 0, "A label is required"),
    href: safeLink,
    archived: z.boolean().default(false),
  })
  .strict();
export const embedLink = z
  .string()
  .max(2048)
  .refine(
    (value) => Boolean(videoSource(value)),
    "Use a supported video or Instagram URL",
  );
export const pageBlockSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,80}$/),
    type: z.enum([
      "heading",
      "paragraph",
      "image",
      "embed",
      "link",
      "separator",
      "list",
    ]),
    text: text(12000).default(""),
    href: mediaLink.default(""),
    src: mediaLink.default(""),
    level: z.number().int().min(1).max(3).default(2),
    loop: z.boolean().optional(),
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
    if (
      block.loop &&
      (block.type !== "embed" || !videoSource(block.src)?.direct)
    )
      ctx.addIssue({
        code: "custom",
        message: "Loop playback requires a direct MP4/WebM source",
      });
    if (block.type === "link" && (!block.href || !block.text))
      ctx.addIssue({
        code: "custom",
        message: "Links need text and a safe destination",
      });
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
    slug: pageSlug,
    title: text(160).refine((s) => s.length > 0, "A page title is required"),
    layout: z
      .enum(["article", "archive", "gallery", "image-grid"])
      .default("article"),
    archived: z.boolean().default(false),
    blocks: z.array(pageBlockSchema).max(250),
    archive: z.array(archiveItemSchema).max(100).default([]),
  })
  .strict();
export type SitePage = z.infer<typeof pageSchema>;
export type PageBlock = z.infer<typeof pageBlockSchema>;
export const emailSettingsSchema = z
  .object({
    provider: z.enum(["gmail", "custom"]).default("gmail"),
    enabled: z.boolean().default(false),
    from: z.string().email().max(254).default("waambat@gmail.com"),
    replyTo: z.union([z.literal(""), z.string().email().max(254)]).default(""),
  })
  .strict();
export const contentSchema = z
  .object({
    sections: z.array(sectionSchema).min(1).max(30),
    pages: z.array(pageSchema).max(80).default([]),
    navigation: z.array(navigationSchema).max(50).default([]),
    email: emailSettingsSchema.default({}),
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
    const pages = new Map(doc.pages.map((p) => [p.slug, p]));
    if (new Set(doc.navigation.map((n) => n.id)).size !== doc.navigation.length)
      ctx.addIssue({
        code: "custom",
        message: "Navigation IDs must be unique",
      });
    for (const section of doc.sections)
      if (
        !["nfts", "ordinals"].includes(section.page) &&
        !pages.has(section.page)
      )
        ctx.addIssue({
          code: "custom",
          message: `Section page /${section.page} does not exist`,
        });
    for (const entry of doc.navigation) {
      if (
        !entry.href.startsWith("/") ||
        entry.archived ||
        ["/", "/ordinals"].includes(entry.href)
      )
        continue;
      const target = pages.get(entry.href.slice(1));
      if (!target)
        ctx.addIssue({
          code: "custom",
          message: `Navigation target ${entry.href} does not exist`,
        });
    }
    const internal = [
      ...doc.pages.flatMap((p) =>
        p.blocks.flatMap((b) => [
          b.href,
          ...b.links.map((l) => l.href),
          ...b.items.map((i) => i.href),
        ]),
      ),
      ...doc.sections.flatMap((s) => s.items.map((i) => i.tokenLink)),
    ];
    for (const href of internal)
      if (
        href.startsWith("/") &&
        !["/", "/ordinals"].includes(href) &&
        !pages.has(href.split(/[?#]/)[0]!.slice(1))
      )
        ctx.addIssue({
          code: "custom",
          message: `Internal link ${href} has no page destination`,
        });
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
      .filter(
        (s) =>
          !s.archived &&
          !content.pages.find((p) => p.slug === s.page)?.archived,
      )
      .flatMap((s) =>
        s.items
          .filter((i) => !i.archived)
          .flatMap((i) => [i.videoSrc, i.mobileVideoSrc, i.poster]),
      ),
    ...content.pages
      .filter((p) => !p.archived)
      .flatMap((p) => [
        ...p.blocks.filter((b) => !b.archived).map((b) => b.src),
        ...p.archive.filter((a) => !a.archived).map((a) => a.image),
      ]),
  ]);
}
