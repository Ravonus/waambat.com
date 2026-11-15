import { derived, state } from "@kerf-js/core";
import type { SitePage } from "#/lib/content";
import SourceImage from "./SourceImage";

/** A retained thumbnail with a small caption; never attaches the unavailable movie. */
export default function ArchivePreview({ art }: { art: SitePage["archive"][number] }) {
  const hovered = state(false),
    pinned = state(false);
  const open = derived(() => hovered.value || pinned.value);
  const close = () => {
    hovered.value = false;
    pinned.value = false;
  };
  return (
    <button
      type="button"
      className="archive-preview"
      data-archive-preview={art.id}
      data-preview-open={open.value ? "true" : "false"}
      aria-label={`About ${art.title || "untitled artwork"}`}
      aria-expanded={open.value}
      aria-controls={`archive-details-${art.id}`}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") hovered.value = true;
      }}
      onPointerLeave={() => {
        hovered.value = false;
      }}
      onFocus={(event) => {
        if (event.currentTarget.matches(":focus-visible")) hovered.value = true;
      }}
      onBlur={close}
      onClick={() => {
        pinned.value = !pinned.value;
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
        aria-hidden={!open.value}
      >
        <strong>{art.title || "Untitled artwork"}</strong>
        <span>{art.description || "Video work from WAAMBAT’s archive."}</span>
      </span>
    </button>
  );
}
