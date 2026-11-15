import { state, derived, onMount, watch, onCleanup } from "@kerf-js/core";
import { update as writeBox } from "#/lib/reactive";
import type { SitePage, PageBlock } from "~/lib/content";
import Archive from "./Archive";
import SourceImage from "./SourceImage";
import VideoEmbed from "./VideoEmbed";
import ArtworkCard from "./ArtworkCard";
import { newTabProps } from "~/lib/new-tab";
import type { PublicContactForm } from "~/lib/forms";
import ContactForm from "./forms/ContactForm";
import SourceLink from "./SourceLink";
function linkedText(block: PageBlock): unknown {
    function emphasized(value: string): unknown {
        const pieces: unknown[] = [];
        let rest = value, index = 0;
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
            pieces.push(next.mark.kind === "strong" ? (<strong key={index}>{next.mark.text}</strong>) : (<em key={index}>{next.mark.text}</em>));
            rest = rest.slice(next.offset + next.mark.text.length);
            index++;
        }
        return pieces;
    }
    if (block.href)
        return (<SourceLink className={block.type === "heading"
                ? "source-heading-link"
                : "source-inline-link"} href={block.href} {...newTabProps(block.href)}>
        {emphasized(block.text)}
      </SourceLink>);
    const parts: unknown[] = [];
    let remaining = block.text, offset = 0;
    while (remaining) {
        const matches = block.links
            .filter((l) => l.text)
            .map((link) => ({ link, index: remaining.indexOf(link.text) }))
            .filter((m) => m.index >= 0)
            .sort((a, b) => a.index - b.index || b.link.text.length - a.link.text.length);
        const match = matches[0];
        if (!match) {
            parts.push(emphasized(remaining));
            break;
        }
        parts.push(emphasized(remaining.slice(0, match.index)), <SourceLink key={offset + match.index} className={block.type === "heading"
                ? "source-heading-link source-heading-part"
                : "source-inline-link"} href={match.link.href} {...newTabProps(match.link.href)}>
        {emphasized(match.link.text)}
      </SourceLink>);
        offset += match.index + match.link.text.length;
        remaining = remaining.slice(match.index + match.link.text.length);
    }
    return parts;
}
export default function ContentPage({ page, forms = [], preview = false, }: {
    page: SitePage;
    forms?: PublicContactForm[];
    preview?: boolean;
}) {
    const renderedForms = derived(() => forms.map((form) => (<ContactForm key={form.id} form={form} preview={preview}/>)));
    const visibleHeadings = derived(() => page.blocks.filter((block) => !block.archived && block.type === "heading" && !!block.text.trim()));
    const levels = derived(() => { const levels = new Map<string, number>(); let previousLevel = 0; for (const block of visibleHeadings.value) {
        const level = previousLevel === 0 ? 1 : Math.min(block.level === 1 ? 2 : block.level, previousLevel + 1);
        levels.set(block.id, level);
        previousLevel = level;
    } return levels; });
    const firstImageId = derived(() => page.blocks.find((block) => !block.archived && block.type === "image")?.id);
    const firstMediaId = derived(() => page.blocks.find((b) => !b.archived && (b.type === "image" || (b.type === "embed" && b.loop)))?.id);
    const renderBlock = (block: PageBlock) => {
        const linked = linkedText(block);
        switch (block.type) {
            case "heading": {
                if (!block.text.trim()) return <div key={block.id} aria-hidden="true">{Array.from({length:block.blankLines || 1}, (_,i)=><br key={i}/>)}</div>;
                const level = levels.value.get(block.id) ?? block.level;

                return (<ContentHeading level={level} key={block.id} className={`text-waambat-pink whitespace-pre-line ${block.level === 3 ? "source-small-heading" : "source-large-heading"}`}>
            {block.blankLines
                        ? Array.from({ length: block.blankLines }, (_, i) => (<br key={i}/>))
                        : linked}
          </ContentHeading>);
            }
            case "link":
            case "paragraph":
                return (<p key={block.id} className="whitespace-pre-line">
            {block.blankLines
                        ? Array.from({ length: block.blankLines }, (_, i) => (<br key={i}/>))
                        : linked}
          </p>);
            case "image":
                return (<figure key={block.id} data-width={block.width ? "" : undefined} style={block.width ? { "--block-width": `${block.width}px` } : undefined} className={page.layout === "image-grid"
                        ? "col-span-2 my-0 md:col-span-1"
                        : "my-8"}>
            {block.href ? (<SourceLink href={block.href} {...newTabProps(block.href)}>
                <SourceImage src={block.src} sizes={page.layout === "image-grid"
                            ? "(max-width: 767px) calc((100vw - 40px) / 2), 240px"
                            : undefined} alt={block.text} eager={block.id === firstImageId.value} className="w-full object-contain"/>
              </SourceLink>) : (<SourceImage src={block.src} sizes={page.layout === "image-grid"
                            ? "(max-width: 767px) calc((100vw - 40px) / 2), 240px"
                            : undefined} alt={block.text} eager={block.id === firstImageId.value} className="w-full object-contain"/>)}
          </figure>);
            case "embed":
                if (block.loop)
                    return (<ArtworkCard key={block.id} showCaption={false} priority={block.id === firstMediaId.value} aspect={block.aspect} ratio={block.ratio} naturalAspect={!block.ratio && !block.aspect} artwork={{
                            id: block.id,
                            title: block.text || page.title,
                            year: "",
                            description: "",
                            tokenLink: block.href || block.src,
                            videoSrc: block.src,
                            mobileVideoSrc: "",
                            loopSrc: "",
                            mobileLoopSrc: "",
                            previewSrc: "",
                            mobilePoster: "",
                            logoSrc: "",
                            poster: "",
                            kind: "video",
                            featured: false,
                            archived: false,
                        }}/>);
                return (<VideoEmbed key={block.id} src={block.src} title={block.text || page.title}/>);
            case "separator":
                return page.layout === "biography" ? (<div key={block.id} className="bio-divider">
            <hr />
          </div>) : (<hr key={block.id} className="my-10 border-white/25"/>);
            case "list":
                return (<ol key={block.id} className="source-list list-decimal pl-8">
            {block.items.map((item, i) => (<li key={i}>
                <span className="source-list-label">
                  {item.href ? (<SourceLink href={item.href} {...newTabProps(item.href)}>
                      {item.text}
                    </SourceLink>) : (item.text)}
                </span>
              </li>))}
          </ol>);
        }
    };
    const visible = derived(() => page.blocks.filter((b) => !b.archived));
    const firstImage = derived(() => visible.value.findIndex((block) => block.type === "image"));
    function biographyColumn(blocks: PageBlock[]) {
        const groups: PageBlock[][] = [];
        for (const block of blocks) {
            const text = ["heading", "paragraph", "link", "list"].includes(block.type);
            const previous = groups.at(-1);
            if (text &&
                previous &&
                ["heading", "paragraph", "link", "list"].includes(previous[0]!.type))
                previous.push(block);
            else
                groups.push([block]);
        }
        return groups.map((group, index) => (<div key={group[0]!.id} className={`${group[0]!.type === "separator" ? "" : "bio-block"} ${index === 0 ? "bio-first" : ""}`}>
        {group.map(renderBlock)}
      </div>));
    }
    return <>{page.layout === "archive" ? (<>
        <Archive items={page.archive}/>
        {renderedForms.value}
      </>) : (<article className={`source-content ${page.layout === "biography" ? "biography-content" : ""} source-${page.layout} pb-16 ${page.layout === "image-grid" ? "grid grid-cols-4 [&>h1]:col-span-full [&>h2]:col-span-full [&>h3]:col-span-full [&>hr]:col-span-full [&>ol]:col-span-full [&>p]:col-span-full" : ""}`}>
      {!visibleHeadings.value.length && <h1 className="sr-only">{page.title}</h1>}
      {page.layout === "biography" ? (<div className="bio-columns">
          <div className="bio-main">
            {biographyColumn(visible.value.filter((b) => b.column !== "side"))}
          </div>
          <aside className="bio-side" aria-label="WAAMBAT animation and portrait">
            {visible.value.filter((b) => b.column === "side").map(renderBlock)}
          </aside>
        </div>) : page.layout === "two-column" ? (<div className="source-two-columns">
          <div>
            {visible.value.filter((b) => b.column !== "side").map(renderBlock)}
          </div>
          <div>
            {visible.value.filter((b) => b.column === "side").map(renderBlock)}
          </div>
        </div>) : page.layout === "image-grid" && firstImage.value > 0 ? (<>
          <div className="instagram-intro col-span-full">
            {visible.value.slice(0, firstImage.value).map(renderBlock)}
          </div>
          {visible.value.slice(firstImage.value).map(renderBlock)}
        </>) : (visible.value.map(renderBlock))}
      {renderedForms.value}
    </article>)}</>;
}

function ContentHeading({level,children,className}:{level:number;children:unknown;className:string}){return <>{level===1?<h1 className={className}>{children}</h1>:level===3?<h3 className={className}>{children}</h3>:<h2 className={className}>{children}</h2>}</>;}
