# Local cursor correction

Base: `6b87621b79dc077249cc4182688b741a63864505` on `feat/gallery-admin-modernization`, draft PR #1. This change has not been pushed or deployed.

The preceding implementation deliberately hid the pink cursor over selectable text, editing fields, resize/drag affordances and pointer-down. It suppressed only the last event target after an animation-frame delay. The reported Mechanics heading selection is consistent with that behavior; hosted QA also observed `cursor:auto` with the overlay hidden.

One mouse cursor now remains in viewport coordinates in a manual, non-interactive top-layer popover. A first CSS layer suppresses native cursors throughout the active own document, including SVG children, generated content and dialog backdrops. The controller resolves authored semantics and commits suppression synchronously, reads hit targets at the actual position, refreshes after DOM commits/scroll/dialog changes, and restores overridden inline declarations. The root rule requires the actual open cursor element, so removing/closing the overlay restores native CSS immediately.

The original pink gradient, arrow and hand silhouettes remain. Matching text, disabled, directional resize, drag, loading, zoom, help and other standard shapes retain their meaning. Text selection, the insertion caret, keyboard editing and focus outlines remain independent. Touch/coarse pointers, unsupported APIs/CSS, native drag-and-drop, native file/select/picker controls and frames retain native behavior. The browser's scrollbar/chrome and cross-origin documents are boundaries; this change neither intercepts artwork interaction nor claims universal suppression outside the document.

Validation in cloud Chromium, on both development and compiled production pages:

- Real DOM computed cursor styles, one cursor node, real pointer/down/up transitions, SVG children, nested disabled states, generated overlay `!important`, inline declaration restoration and 26 rendered masks.
- Mechanics heading drag-selection, input typing/replacement with insertion position/caret color, textarea typing and actual drag resizing, contenteditable editing.
- Stationary DOM replacement, real Next navigation and Back/Forward, archive viewer controls, mobile menu open/close/navigation, keyboard focus/Tab/Escape.
- Real 390px touch navigation, reduced motion, animated gradient pixels, native drag/frame/picker handoff, blur/cancel/re-entry, removed-overlay and missing-popover API fallback. No page JavaScript errors.
- `pnpm check`, 33 unit tests and `pnpm build` passed. Compiled navigation checks also passed, including interrupted requests and repeated dismissal/scroll restoration.

Run `pnpm test:cursor` after `pnpm build`, or set `CURSOR_CHECK_ORIGIN` to an existing local server. Results and screenshots default to `/tmp/waambat-cursor-evidence` and can be redirected with `CURSOR_CHECK_OUTPUT`. External artwork transport is blocked in this suite; the foreign-frame control is an explicit fixture. Browser-native pointer pixels and hosted Safari/OS coverage are separate acceptance evidence.
