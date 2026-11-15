"use client";
import { useState } from "react";
import type { SitePage } from "~/lib/content";
import SourceImage from "./SourceImage";

/** A retained thumbnail with a small caption; never attaches the unavailable movie. */
export default function ArchivePreview({ art }: { art: SitePage["archive"][number] }) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hovered || pinned;
  const close = () => {
    setHovered(false);
    setPinned(false);
  };
  return (
    <button
      type="button"
      className="archive-preview"
      data-archive-preview={art.id}
      data-preview-open={open ? "true" : "false"}
      aria-label={`About ${art.title || "untitled artwork"}`}
      aria-expanded={open}
      aria-controls={`archive-details-${art.id}`}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") setHovered(true);
      }}
      onPointerLeave={() => {
        setHovered(false);
      }}
      onFocus={(event) => {
        if (event.currentTarget.matches(":focus-visible")) setHovered(true);
      }}
      onBlur={close}
      onClick={() => {
        setPinned((value) => !value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
    >
      <SourceImage
        src={art.image}
        alt=""
        sizes="(max-width: 767px) calc(100vw - 40px), 1100px"
        className="h-full w-full object-contain"
      />
      <span
        id={`archive-details-${art.id}`}
        className="archive-preview-caption"
        aria-hidden={!open}
      >
        <strong>{art.title || "Untitled artwork"}</strong>
        <span>{art.description || "Video work from WAAMBAT’s archive."}</span>
      </span>
    </button>
  );
}
