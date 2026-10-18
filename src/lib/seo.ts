import type { Metadata } from "next";
import type { Content, SitePage } from "./content";
export const siteOrigin = "https://waamb.at";
export const siteDescription =
  "Video paintings, cryptoart, and Ordinals by WAAMBAT — artist Lindsay Scoggins.";
const descriptions: Record<string, string> = {
  ordinals:
    "Explore WAAMBAT’s Ordinals: LUX, Kismet Twist, Edge Corporeal, and early inscriptions. View the artworks and their original inscription pages.",
  mechanics:
    "Explore the mechanics behind WAAMBAT’s video paintings, infinite loops, and digital art.",
  "art-by-waambat":
    "An archive of video art and paintings by WAAMBAT, artist Lindsay Scoggins. Explore the works and their original video sources.",
  "blog-press":
    "Writing, interviews, exhibitions, and press about WAAMBAT and the work of artist Lindsay Scoggins.",
  "bio-waambat":
    "Meet WAAMBAT — artist Lindsay Scoggins — and explore her biography, video art, and digital paintings.",
  "contact-waambat":
    "Contact WAAMBAT about collecting artwork, commissions, collaborations, exhibitions, or press. Send a message to the studio.",
  instagram:
    "Explore WAAMBAT’s visual work and connect with the artist on Instagram.",
};
export function indexableSite() {
  return (
    !["deploy-preview", "branch-deploy"].includes(
      process.env.WAAMBAT_DEPLOY_CONTEXT ?? process.env.CONTEXT ?? "",
    ) &&
    process.env.WAAMBAT_PRIVATE_SITE !== "1" &&
    process.env.WAAMBAT_REVIEW_BUILD !== "1"
  );
}
export function pageDescription(page: SitePage) {
  return (
    page.seo.description ||
    descriptions[page.slug] ||
    page.blocks
      .find(
        (block) =>
          !block.archived && block.type === "paragraph" && block.text.trim(),
      )
      ?.text.replace(/\s+/g, " ")
      .slice(0, 170) ||
    siteDescription
  );
}
export function pageMetadata(
  path: string,
  title: string,
  description: string,
  image?: string,
  noIndex = false,
): Metadata {
  const url = new URL(path, siteOrigin).href;
  const share = new URL(
    image || `/social/${path === "/" ? "home" : path.slice(1)}`,
    siteOrigin,
  ).href;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: `${title} — WAAMBAT`,
      description,
      siteName: "WAAMBAT",
      images: [
        {
          url: share,
          width: 1200,
          height: 630,
          alt: `${title} — artwork by WAAMBAT`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — WAAMBAT`,
      description,
      images: [{ url: share, alt: `${title} — artwork by WAAMBAT` }],
    },
    robots: {
      index: indexableSite() && !noIndex,
      follow: indexableSite(),
      googleBot: {
        index: indexableSite() && !noIndex,
        follow: indexableSite(),
        "max-image-preview": "large",
      },
    },
  };
}
export function publicPaths(content: Content) {
  return [
    "/",
    "/ordinals",
    ...content.pages
      .filter(
        (page) =>
          !page.archived &&
          !page.seo.noIndex &&
          !["splash", "split-splash"].includes(page.layout),
      )
      .map((page) => `/${page.slug}`),
  ];
}
