"use client";
import { useEffect, useRef, useState } from "react";
import type { SitePage } from "~/lib/content";
import { archiveRows } from "~/lib/archive-layout";
import SourceImage from "./SourceImage";
import VideoEmbed from "./VideoEmbed";
import InlineVideo from "./InlineVideo";
import { MediaIcon } from "./MediaControls";
export default function Archive({ items }: { items: SitePage["archive"] }) {
  const visible = items.filter((i) => !i.archived);
  const container = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [width, setWidth] = useState(1392);
  const [gap, setGap] = useState(10);
  const [selected, setSelected] = useState<number | null>(null);
  const [info, setInfo] = useState(false);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setWidth(el.clientWidth);
      setGap(
        parseFloat(
          getComputedStyle(el).getPropertyValue("--site-archive-gap"),
        ) || 10,
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const el = dialog.current;
    if (!el || selected === null) return;
    if (!el.open) el.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [selected]);
  const index =
    selected === null ? null : Math.min(selected, visible.length - 1);
  const item = index === null ? undefined : visible[index];
  const select = (next: number) => {
    setInfo(false);
    setSelected((next + visible.length) % visible.length);
  };
  return (
    <section aria-label="Art archive" className="pb-16">
      <div ref={container} className="archive-montage">
        {archiveRows(visible, width, gap).map((row) => (
          <div
            key={row.items[0]!.id}
            className="archive-row"
            style={{ height: row.height, gap }}
          >
            {row.items.map((art) => (
              <div
                key={art.id}
                className="archive-tile"
                style={{ flexGrow: art.ratio }}
                data-archive-artwork={art.id}
              >
                {art.embed ? (
                  <InlineVideo
                    key={art.embed}
                    src={art.embed}
                    poster={art.image}
                    title={art.title || "Untitled artwork"}
                    suspended={selected !== null}
                  />
                ) : (
                  <SourceImage
                    src={art.image}
                    alt=""
                    sizes="(max-width: 767px) calc(100vw - 40px), 1100px"
                    className="h-full w-full object-contain"
                  />
                )}
                <button
                  type="button"
                  className="media-control archive-expand"
                  onClick={() => select(visible.indexOf(art))}
                  aria-label={`View ${art.title || "untitled artwork"}`}
                  title="Open fullscreen viewer"
                >
                  <MediaIcon kind="expand" />
                </button>
                {art.title && (
                  <div className="archive-caption">{art.title}</div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="archive-viewer"
        aria-label="Archive artwork viewer"
        onClose={() => {
          setSelected(null);
          setInfo(false);
        }}
        onKeyDown={(e) => {
          if (index === null) return;
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            select(index + (e.key === "ArrowLeft" ? -1 : 1));
          }
        }}
      >
        <button
          type="button"
          className="archive-close"
          aria-label="Close archive viewer"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
        {item && (
          <div className="archive-viewer-content">
            <div
              className="archive-viewer-media"
              style={{ aspectRatio: item.videoRatio ?? item.ratio }}
            >
              {item.embed ? (
                <VideoEmbed
                  key={item.id}
                  src={item.embed}
                  title={item.title || "Untitled artwork"}
                  poster={item.image}
                  activated
                  ratio={item.videoRatio ?? item.ratio}
                  compact
                />
              ) : (
                <SourceImage
                  src={item.image}
                  alt={item.title}
                  eager
                  className="h-full w-full object-contain"
                />
              )}
            </div>
            <div className="my-5 flex justify-center gap-6">
              <button
                type="button"
                onClick={() => setInfo(!info)}
                aria-expanded={info}
                aria-controls="archive-info"
              >
                info
              </button>
              <button
                type="button"
                onClick={() => select(index! - 1)}
                aria-label="Previous artwork"
              >
                prev
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={() => select(index! + 1)}
                aria-label="Next artwork"
              >
                next
              </button>
            </div>
            <p
              id="archive-info"
              hidden={!info}
              className="text-center whitespace-pre-line"
            >
              {item.title}
              {item.description ? `\n${item.description}` : ""}
            </p>
            {item.embed && info && (
              <p className="text-center text-sm">
                <a href={item.embed} target="_blank" rel="noopener noreferrer">
                  Open original source ↗
                </a>
              </p>
            )}
          </div>
        )}
      </dialog>
    </section>
  );
}
