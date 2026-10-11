import type { SitePage, PageBlock } from "~/lib/content";
import type { ReactNode } from "react";
import Archive from "./Archive";
import SourceImage from "./SourceImage";
import VideoEmbed from "./VideoEmbed";
import ArtworkCard from "./ArtworkCard";
function linkedText(block: PageBlock): ReactNode {
  if (block.href) return <a href={block.href}>{block.text}</a>;
  const parts: ReactNode[] = [];
  let remaining = block.text,
    offset = 0;
  while (remaining) {
    const matches = block.links
      .filter((l) => l.text)
      .map((link) => ({ link, index: remaining.indexOf(link.text) }))
      .filter((m) => m.index >= 0)
      .sort(
        (a, b) => a.index - b.index || b.link.text.length - a.link.text.length,
      );
    const match = matches[0];
    if (!match) {
      parts.push(remaining);
      break;
    }
    parts.push(
      remaining.slice(0, match.index),
      <a key={offset + match.index} href={match.link.href}>
        {match.link.text}
      </a>,
    );
    offset += match.index + match.link.text.length;
    remaining = remaining.slice(match.index + match.link.text.length);
  }
  return parts;
}
export default function ContentPage({ page }: { page: SitePage }) {
  if (page.layout === "archive") return <Archive items={page.archive} />;
  return (
    <article
      className={`[&_a]:text-waambat-link [&_a:hover]:text-waambat-link-hover pb-16 ${page.layout === "image-grid" ? "grid grid-cols-6 gap-x-4 [&>h1]:col-span-full [&>h2]:col-span-full [&>h3]:col-span-full [&>hr]:col-span-full [&>ol]:col-span-full [&>p]:col-span-full" : ""}`}
    >
      {page.blocks
        .filter((b) => !b.archived)
        .map((block) => {
          const linked = linkedText(block);
          switch (block.type) {
            case "heading": {
              const Heading =
                block.level === 1 ? "h1" : block.level === 3 ? "h3" : "h2";
              return (
                <Heading
                  key={block.id}
                  className={`text-waambat-pink my-7 text-[26px] leading-snug font-bold`}
                >
                  {linked}
                </Heading>
              );
            }
            case "link":
            case "paragraph":
              return (
                <p key={block.id} className="my-5 whitespace-pre-line">
                  {linked}
                </p>
              );
            case "image":
              return (
                <figure
                  key={block.id}
                  className={
                    page.layout === "image-grid"
                      ? "col-span-3 my-2 sm:col-span-2"
                      : "my-8"
                  }
                >
                  {block.href ? (
                    <a href={block.href}>
                      <SourceImage
                        src={block.src}
                        sizes={
                          page.layout === "image-grid"
                            ? "(max-width: 639px) calc((100vw - 56px) / 2), 310px"
                            : undefined
                        }
                        alt={block.text}
                        className="w-full object-contain"
                      />
                    </a>
                  ) : (
                    <SourceImage
                      src={block.src}
                      sizes={
                        page.layout === "image-grid"
                          ? "(max-width: 639px) calc((100vw - 56px) / 2), 310px"
                          : undefined
                      }
                      alt={block.text}
                      className="w-full object-contain"
                    />
                  )}
                </figure>
              );
            case "embed":
              if (block.loop)
                return (
                  <ArtworkCard
                    key={block.id}
                    showCaption={false}
                    artwork={{
                      id: block.id,
                      title: block.text || "Archived video",
                      year: "",
                      description: "",
                      tokenLink: block.href || block.src,
                      videoSrc: block.src,
                      mobileVideoSrc: "",
                      poster: "",
                      kind: "video",
                      featured: false,
                      archived: false,
                    }}
                  />
                );
              return (
                <VideoEmbed
                  key={block.id}
                  src={block.src}
                  title={block.text || page.title}
                />
              );
            case "separator":
              return <hr key={block.id} className="my-10 border-white/25" />;
            case "list":
              return (
                <ol
                  key={block.id}
                  className="my-8 list-decimal space-y-5 pl-8 text-[18px]"
                >
                  {block.items.map((item, i) => (
                    <li key={i}>
                      {item.href ? (
                        <a href={item.href}>{item.text}</a>
                      ) : (
                        item.text
                      )}
                    </li>
                  ))}
                </ol>
              );
          }
        })}
    </article>
  );
}
