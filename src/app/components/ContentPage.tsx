import type { SitePage, PageBlock } from "~/lib/content";
import type { ReactNode } from "react";
import Archive from "./Archive";
import SourceImage from "./SourceImage";
import VideoEmbed from "./VideoEmbed";
import ArtworkCard from "./ArtworkCard";
function linkedText(block: PageBlock): ReactNode {
  function emphasized(value: string): ReactNode {
    const pieces: ReactNode[] = [];
    let rest = value,
      index = 0;
    while (rest) {
      const next = block.marks
        .map((mark) => ({ mark, offset: rest.indexOf(mark.text) }))
        .filter((m) => m.offset >= 0)
        .sort((a, b) => a.offset - b.offset)[0];
      if (!next) {
        pieces.push(rest);
        break;
      }
      pieces.push(rest.slice(0, next.offset));
      pieces.push(
        next.mark.kind === "strong" ? (
          <strong key={index}>{next.mark.text}</strong>
        ) : (
          <em key={index}>{next.mark.text}</em>
        ),
      );
      rest = rest.slice(next.offset + next.mark.text.length);
      index++;
    }
    return pieces;
  }
  if (block.href)
    return (
      <a
        className={
          block.type === "heading"
            ? "source-heading-link"
            : "source-inline-link"
        }
        href={block.href}
      >
        {emphasized(block.text)}
      </a>
    );
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
      parts.push(emphasized(remaining));
      break;
    }
    parts.push(
      emphasized(remaining.slice(0, match.index)),
      <a
        key={offset + match.index}
        className="source-inline-link"
        href={match.link.href}
      >
        {emphasized(match.link.text)}
      </a>,
    );
    offset += match.index + match.link.text.length;
    remaining = remaining.slice(match.index + match.link.text.length);
  }
  return parts;
}
export default function ContentPage({ page }: { page: SitePage }) {
  if (page.layout === "archive") return <Archive items={page.archive} />;
  const renderBlock = (block: PageBlock) => {
    const linked = linkedText(block);
    switch (block.type) {
      case "heading": {
        const Heading =
          block.level === 1 ? "h1" : block.level === 3 ? "h3" : "h2";
        return (
          <Heading
            key={block.id}
            className="text-waambat-pink whitespace-pre-line"
          >
            {block.blankLines
              ? Array.from({ length: block.blankLines }, (_, i) => (
                  <br key={i} />
                ))
              : linked}
          </Heading>
        );
      }
      case "link":
      case "paragraph":
        return (
          <p key={block.id} className="whitespace-pre-line">
            {block.blankLines
              ? Array.from({ length: block.blankLines }, (_, i) => (
                  <br key={i} />
                ))
              : linked}
          </p>
        );
      case "image":
        return (
          <figure
            key={block.id}
            className={
              page.layout === "image-grid"
                ? "col-span-2 my-0 md:col-span-1"
                : "my-8"
            }
          >
            {block.href ? (
              <a href={block.href}>
                <SourceImage
                  src={block.src}
                  sizes={
                    page.layout === "image-grid"
                      ? "(max-width: 767px) calc((100vw - 40px) / 2), 240px"
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
                    ? "(max-width: 767px) calc((100vw - 40px) / 2), 240px"
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
              aspect={block.aspect}
              ratio={block.ratio}
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
        return page.layout === "biography" ? (
          <div key={block.id} className="bio-divider">
            <hr />
          </div>
        ) : (
          <hr key={block.id} className="my-10 border-white/25" />
        );
      case "list":
        return (
          <ol key={block.id} className="source-list list-decimal pl-8">
            {block.items.map((item, i) => (
              <li key={i}>
                <h3>
                  {item.href ? <a href={item.href}>{item.text}</a> : item.text}
                </h3>
              </li>
            ))}
          </ol>
        );
    }
  };
  const visible = page.blocks.filter((b) => !b.archived);
  function biographyColumn(blocks: PageBlock[]) {
    const groups: PageBlock[][] = [];
    for (const block of blocks) {
      const text = ["heading", "paragraph", "link", "list"].includes(
        block.type,
      );
      const previous = groups.at(-1);
      if (
        text &&
        previous &&
        ["heading", "paragraph", "link", "list"].includes(previous[0]!.type)
      )
        previous.push(block);
      else groups.push([block]);
    }
    return groups.map((group, index) => (
      <div
        key={group[0]!.id}
        className={`${group[0]!.type === "separator" ? "" : "bio-block"} ${index === 0 ? "bio-first" : ""}`}
      >
        {group.map(renderBlock)}
      </div>
    ));
  }
  return (
    <article
      className={`source-content ${page.layout === "biography" ? "biography-content" : ""} source-${page.layout} pb-16 ${page.layout === "image-grid" ? "grid grid-cols-4 [&>h1]:col-span-full [&>h2]:col-span-full [&>h3]:col-span-full [&>hr]:col-span-full [&>ol]:col-span-full [&>p]:col-span-full" : ""}`}
    >
      {page.layout === "biography" ? (
        <div className="bio-columns">
          <div className="bio-main">
            {biographyColumn(visible.filter((b) => b.column !== "side"))}
          </div>
          <aside
            className="bio-side"
            aria-label="WAAMBAT animation and portrait"
          >
            {visible.filter((b) => b.column === "side").map(renderBlock)}
          </aside>
        </div>
      ) : page.layout === "two-column" ? (
        <div className="source-two-columns">
          <div>
            {visible.filter((b) => b.column !== "side").map(renderBlock)}
          </div>
          <div>
            {visible.filter((b) => b.column === "side").map(renderBlock)}
          </div>
        </div>
      ) : (
        visible.map(renderBlock)
      )}
    </article>
  );
}
