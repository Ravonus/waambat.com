"use client";
import { useState } from "react";
import type { SitePage } from "~/lib/content";
import SourceImage from "./SourceImage";
import VideoEmbed from "./VideoEmbed";
export default function Archive({ items }: { items: SitePage["archive"] }) {
  const visible = items.filter((i) => !i.archived);
  const [selected, setSelected] = useState(0);
  const [info, setInfo] = useState(false);
  if (!visible.length) return null;
  const index = Math.min(selected, visible.length - 1),
    item = visible[index]!;
  const select = (i: number) =>
    setSelected((i + visible.length) % visible.length);
  return (
    <section aria-label="Art archive" className="pb-16 text-center">
      <div
        className="flex min-h-[45vh] items-center justify-center"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            select(index - 1);
          }
          if (e.key === "ArrowRight") {
            e.preventDefault();
            select(index + 1);
          }
        }}
        tabIndex={0}
        aria-label="Archive slideshow. Use left and right arrow keys."
      >
        {item.embed ? (
          <VideoEmbed
            key={item.id}
            src={item.embed}
            title={item.title}
            poster={item.image}
          />
        ) : (
          <SourceImage
            key={item.id}
            src={item.image}
            alt={item.title}
            eager
            className="max-h-[70vh] w-full object-contain"
          />
        )}
      </div>
      <div className="my-6 flex justify-center gap-6">
        <button
          onClick={() => setInfo(!info)}
          aria-expanded={info}
          aria-controls="archive-info"
        >
          info
        </button>
        <button onClick={() => select(index - 1)} aria-label="Previous artwork">
          prev
        </button>
        <span>/</span>
        <button onClick={() => select(index + 1)} aria-label="Next artwork">
          next
        </button>
      </div>
      <p
        id="archive-info"
        hidden={!info}
        className="my-5 whitespace-pre-line"
        aria-live="polite"
      >
        {item.title}
        {item.description ? `\n${item.description}` : ""}
      </p>
      <div
        className="flex flex-wrap justify-center gap-x-3 gap-y-1"
        aria-label="Choose archive artwork"
      >
        {visible.map((art, i) => (
          <button
            key={art.id}
            onClick={() => select(i)}
            aria-label={`Artwork ${i + 1}: ${art.title}`}
            aria-current={index === i ? "true" : undefined}
            className={index === i ? "text-waambat-pink" : ""}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-5 gap-2 md:grid-cols-10">
        {visible.map((art, i) => (
          <button
            key={art.id}
            onClick={() => select(i)}
            aria-label={`View ${art.title}`}
          >
            <SourceImage
              src={art.image}
              alt=""
              sizes="(max-width: 767px) calc((100vw - 72px) / 5), 88px"
              className="aspect-square w-full object-cover"
            />
          </button>
        ))}
      </div>
    </section>
  );
}
