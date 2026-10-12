// Masks share the existing animated pink gradient. Coordinates are hotspots,
// not a trailing decoration; centered shapes keep their hotspot at the pointer.
const svg = (body: string, width = 28, height = width) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${body}</svg>`)}")`;
const path = (d: string) => `<path d="${d}"/>`;
const lines = (d: string) =>
  `<path fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="${d}"/>`;
const horizontal = lines("M2 14h24M7 9l-5 5 5 5m14-10 5 5-5 5");
const vertical = lines("M14 2v24M9 7l5-5 5 5M9 21l5 5 5-5");
const ring =
  '<circle cx="14" cy="14" r="11" fill="none" stroke="black" stroke-width="3"/>';
const magnifier =
  '<circle cx="11" cy="11" r="8" fill="none" stroke="black" stroke-width="3"/>' +
  lines("m17 17 9 9M7 11h8");
const hand = path(
  "M6 17V4a3 3 0 0 1 6 0v8a3 3 0 0 1 5 1 3 3 0 0 1 5 2 3 3 0 0 1 4 3v5c0 4-3 8-7 8h-6c-3 0-5-2-6-4L1 19c-2-4 2-6 5-2Z",
);
const shape = (
  body: string,
  width = 28,
  height = width,
  x = width / 2,
  y = height / 2,
) => ({
  mask: svg(body, width, height),
  width,
  height,
  x,
  y,
});
const ew = shape(horizontal);
const ns = shape(vertical);
const nwse = shape(`<g transform="rotate(45 14 14)">${horizontal}</g>`);
const nesw = shape(`<g transform="rotate(-45 14 14)">${horizontal}</g>`);
const blocked = shape(ring + lines("M6 6l16 16"));
const busy = shape(
  '<circle cx="14" cy="14" r="10" fill="none" stroke="black" stroke-width="3"/>' +
    lines("M14 7v7l5 3"),
);
export const cursorShapes = {
  default: shape(path("M0 0v24l6-6 4 10 5-2-5-9h11Z"), 22, 29, 0, 0),
  pointer: shape(hand, 27, 32, 7, 1),
  text: shape(lines("M10 2h8M14 2v24M10 26h8")),
  "vertical-text": shape(lines("M2 10v8M2 14h24M26 10v8")),
  "not-allowed": blocked,
  "no-drop": blocked,
  "ew-resize": ew,
  "e-resize": ew,
  "w-resize": ew,
  "col-resize": ew,
  "ns-resize": ns,
  "n-resize": ns,
  "s-resize": ns,
  "row-resize": ns,
  "nwse-resize": nwse,
  "nw-resize": nwse,
  "se-resize": nwse,
  "nesw-resize": nesw,
  "ne-resize": nesw,
  "sw-resize": nesw,
  move: shape(horizontal + vertical),
  "all-scroll": shape(horizontal + vertical),
  crosshair: shape(lines("M14 2v24M2 14h24")),
  cell: shape(
    lines("M14 2v24M2 14h24") + '<rect x="9" y="9" width="10" height="10"/>',
  ),
  grab: shape(
    path(
      "M5 15V9a2 2 0 0 1 4 0v5-9a2 2 0 0 1 4 0v9-10a2 2 0 0 1 4 0v10-8a2 2 0 0 1 4 0v10l2-3c2-2 5 0 3 3l-5 7c-2 3-4 4-8 4-6 0-10-5-10-10v-3c0-3 2-3 2-1Z",
    ),
  ),
  grabbing: shape(
    path(
      "M5 12V9c0-3 4-3 4 0 0-4 4-4 4 0 0-4 4-4 4 0 0-3 4-3 4 0v3c4-2 6 1 4 4l-4 6c-2 3-5 4-9 4-5 0-9-4-9-9v-4c0-3 2-3 2-1Z",
    ),
  ),
  wait: busy,
  progress: busy,
  "zoom-in": shape(magnifier + lines("M11 7v8")),
  "zoom-out": shape(magnifier),
  help: shape(ring + lines("M10 9c0-6 10-6 8 0-1 3-4 3-4 7M14 21h.01")),
  copy: shape(
    '<rect x="3" y="3" width="16" height="16" rx="1"/>' +
      lines("M10 23h13V10M20 5v8M16 9h8"),
  ),
  alias: shape(lines("M5 23V12h17M16 5l7 7-7 7")),
  "context-menu": shape(lines("M4 5h20M4 14h20M4 23h20")),
} as const;
export type CursorState = keyof typeof cursorShapes;

export function cursorStateAt(
  target: Element,
  x: number,
  y: number,
): CursorState | null {
  const disabled = target.closest(":disabled,[aria-disabled=true],[inert]");
  if (disabled) return "not-allowed";
  if (
    target.closest(
      "iframe,object,embed,video[controls],audio[controls],select,input[type=file],input[type=color],input[type=date],input[type=datetime-local],input[type=time],input[type=month],input[type=week],input[type=number]",
    )
  )
    return null;
  const style = getComputedStyle(target);
  // Respect explicitly hidden or third-party image cursors rather than inventing
  // their meaning. The caller restores native behavior for unsupported states.
  const declared = style.cursor;
  if (declared === "none" || declared.includes("url(")) return null;
  const bounds = target.getBoundingClientRect();
  const leftHandle = style.direction === "rtl";
  if (
    style.resize !== "none" &&
    y >= bounds.bottom - 16 &&
    (leftHandle ? x <= bounds.left + 16 : x >= bounds.right - 16)
  ) {
    return style.resize === "horizontal"
      ? "ew-resize"
      : style.resize === "vertical"
        ? "ns-resize"
        : leftHandle
          ? "nesw-resize"
          : "nwse-resize";
  }
  if (declared !== "auto" && declared !== "default") {
    return Object.hasOwn(cursorShapes, declared)
      ? (declared as CursorState)
      : null;
  }
  if (
    target.closest(
      "a[href],button,[role=button],[role=link],summary,input[type=button],input[type=submit],input[type=reset],input[type=checkbox],input[type=radio],input[type=range]",
    )
  )
    return "pointer";
  if (
    target.closest(
      "input,textarea,[contenteditable]:not([contenteditable=false])",
    )
  )
    return "text";
  if (style.userSelect !== "none") {
    if (
      target.closest(
        "p,h1,h2,h3,h4,h5,h6,li,label,blockquote,figcaption,pre,code",
      )
    )
      return "text";
    // Bare text nodes in divs/spans also have a native selection affordance.
    const range = document.caretRangeFromPoint?.(x, y);
    if (
      range?.startContainer.nodeType === Node.TEXT_NODE &&
      target.contains(range.startContainer)
    ) {
      const length = range.startContainer.textContent?.length ?? 0;
      const offset = Math.min(range.startOffset, Math.max(0, length - 1));
      range.setStart(range.startContainer, offset);
      range.setEnd(range.startContainer, Math.min(offset + 1, length));
      const rect = range.getBoundingClientRect();
      if (
        x >= rect.left - 2 &&
        x <= rect.right + 2 &&
        y >= rect.top &&
        y <= rect.bottom
      )
        return "text";
    }
  }
  return "default";
}
