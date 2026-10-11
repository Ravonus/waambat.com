import type { SitePage, PageBlock } from "~/lib/content";
import type { ReactNode } from "react";
import Archive from "./Archive";
import SourceImage from "./SourceImage";
import VideoEmbed from "./VideoEmbed";
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
    <article className="[&_a]:text-waambat-link pb-16">
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
                  className={`${block.level === 1 ? "text-[27px]" : block.level === 2 ? "text-[22px]" : "text-[18px]"} text-waambat-pink my-7 leading-snug`}
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
                <figure key={block.id} className="my-8">
                  {block.href ? (
                    <a href={block.href}>
                      <SourceImage
                        src={block.src}
                        alt={block.text}
                        className="w-full object-contain"
                      />
                    </a>
                  ) : (
                    <SourceImage
                      src={block.src}
                      alt={block.text}
                      className="w-full object-contain"
                    />
                  )}
                </figure>
              );
            case "embed":
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
