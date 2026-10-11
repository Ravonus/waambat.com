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
export const contentSchema = z
  .object({ sections: z.array(sectionSchema).min(1).max(30) })
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
  return new Set(
    content.sections
      .filter((s) => !s.archived)
      .flatMap((s) =>
        s.items
          .filter((i) => !i.archived)
          .flatMap((i) => [i.videoSrc, i.mobileVideoSrc, i.poster]),
      ),
  );
}
