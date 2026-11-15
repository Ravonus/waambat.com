# UX / interaction critic: WAAMBAT pastel accent pass

Independent review by a separate agent. I didn't implement any of this pass and I didn't edit any source.

- Branch `polish/pastel-accent-ui`, uncommitted on top of `412b456`. Live preview http://localhost:3287/ (headless Chromium, playwright-core 1.64.1), 2026-11-14 17:36 to 17:47 MST.
- The source changed while I was reviewing. The hash of `git diff -- kerf/src kerf/test` (excluding `media-downloads.json`) was `6b3053c5` at the start and `7ce463ba` at the end. Two changes landed during the review:
  - `.option[data-active]` now uses `--ui-accent` instead of `--ui-accent-hover`. The live page already served this when I measured.
  - `MediaDownload.tsx` and the new `lib/media-download.ts` changed the catalog lookup. That belongs to the concurrent media task. I re-ran the Save-dialog probe after it landed and the results were the same.
- Scripts, JSON results and screenshots are in `evidence/ui-refinement/reviews/ux/`. Each script there can be re-run with `node <script>.mjs`.
- No real message was sent. Every contact POST was intercepted with a fake 200/400/500 response or an abort (`form.mjs`, `form-status.mjs`). The Save flow sent only HEAD requests to `/media-originals/…`. GETs of originals were aborted and no original was downloaded.
- I couldn't test admin surfaces because they need authentication. They are **unverified**.

## Scope change during the review (owner, relayed by the coordinator)

The owner changed direction while this review was in progress. The new direction is:
1. The cursor and all titles and headings move to the wordmark pink `#ff94b2`.
2. The mobile menu, hamburger, close button and side scrollbar are redesigned, with open and close animations.
3. Deliberate datamosh/glitch effects on hovers, clicks, inputs and menu animations. This overrides the earlier "no glitch" rule.

I stopped exercising those areas when the message arrived. Every result below that touches them is marked **SUPERSEDED, re-review in round 2**. It describes the pastel revision only and should not count for or against the new direction. These results remain valid:
- forms, including the custom select;
- the Save dialog;
- media controls and the archive viewer;
- navigation pending and arrival;
- console.

## Findings

### 1. SUPERSEDED, re-review in round 2 (was MAJOR): the pastel cursor blends into pale-pink headings and accent-filled buttons

**Where:** custom cursor (`globals.css` `.waambat-cursor span`) over `#e1bcc2` headings, the Save button and the submit button while it is pending.

**Steps to reproduce:**
1. On a fine-pointer desktop, hover the "Get in touch" heading on `/contact-waambat`. The cursor becomes the text I-beam.
2. Right-click any artwork, wait for "Ready when you are.", and hover **Save original**.
3. Submit the contact form with a held response and hover the "Sending…" button.

**Expected:** the user's pointer stays clearly visible on every surface. The baseline managed this with the dark `#c60064` stop in its gradient.

**Actual:** every stop in the cursor gradient is now `#f1d1d6`, `#e1bcc2` or `#c39ca2`.
- Over the heading pink the I-beam is the same color as the glyphs. Contrast is 1.0:1, or 1.4:1 at the darkest stop, against 3.4:1 for the old magenta stop.
- Over the hovered Save button (`#f1d1d6`) the hand reaches 1.2–1.7:1, against 3.5:1 before.
- Only the 1px black bottom-right drop shadow is left to separate it. The not-allowed ring over the pending submit is almost invisible.

The shape, movement and fallback behavior are all intact (see "What works well"). The problem is the color alone.

**Suggested fix (stays in the family):** give the ink a full-perimeter dark edge instead of the single offset shadow, for example a 1px outline in `--ui-on-accent`, or swap the `--ui-accent-hover` stops for `--ui-accent-pressed` so a darker band is always present.

**Status:** superseded. The cursor and the headings are both moving to `#ff94b2`. If they share one color, the same camouflage will happen again: a pink cursor over pink headings. It could also happen over any fill that uses `#ff94b2` or a nearby shade. Round 2 should re-test the cursor over headings and over accent-filled buttons.

**Evidence:**
- `ux/cmp-cursor-after-vs-baseline.png`. Left pair: heading, after vs. simulated baseline. Right pair: Save button, after vs. simulated baseline. The baseline was simulated by re-injecting the old gradient with the animation frozen.
- `ux/contact-cursor-over-art.png` ("mallSpirit" / "cieve your Q" heading frames).
- `ux/zoom-save-hover-cursor.png`, `ux/submit-pending.png`.
- Script: `ux/cursor-compare.mjs`, `ux/cursor-heading.mjs`.

### 2. MINOR, hover treatment SUPERSEDED (re-review in round 2): a hovered desktop nav link now looks like the current-page link

**Steps to reproduce:** at 1440px on `/contact-waambat`, hover "quantum mechanics".

**Expected:** hover reads as a transient state, distinct from `aria-current`.

**Actual:** the hovered link turns `#f1d1d6` and gains the full underline with the split shadow. The current link ("collect + contact") is `#ffffff` with the same underline treatment. The two are 1.42:1 apart (2.46:1 with the baseline `#fa75d0`). In the screenshot it looks as if two items are current.

Hover feedback is still present (grey `#9c9c9c` to near white, plus the underline), so this isn't lost feedback. It is confusable feedback. Hovering the current link changes it from white to `#f1d1d6`, which is almost no feedback at all.

**Suggestion:** use the base `#e1bcc2` for `--ui-accent-nav-hover` so hover reads as pink rather than white.

**Status:** hovers will get glitch effects, so the hover color itself may change. The underlying rule still applies in round 2: hover must not look the same as `aria-current`.

**Evidence:** `ux/nav-desktop-hover.png`, compared with `before/state-nav-hover.png` and `after/state-nav-hover.png`; `ux/nav-desktop.json` (`hover`, `hoverCurrent`).

### 3. MINOR: the active option in the custom select is harder to find with arrow keys

**Steps to reproduce:** focus "What brings you here?", press ArrowDown, then ArrowDown again.

**Expected:** the active descendant is obvious. It's the only visual cue a keyboard user gets.

**Actual:** the active row fill is `#201a1b` on a list background of about `#120f10` (1.11:1). The text goes from `#ebebeb` to `#e1bcc2` (1.45:1). The baseline used a saturated pink fill and `#ff94b2` text, so the hue made it clear. Now the row is visible but faint, especially away from the checkmarked selected row.

**Suggestion:** a stronger tint for the active row (for example `--ui-accent` at 18–22%), or a 2px inset start border in `--ui-accent`.

**Evidence:** `ux/select-keyboard-active-zoom.png`, compared with `before/state-select-open.png` and `after/state-select-open.png`; `ux/form.json` (`kbArrows`).

### 4. MINOR: the "Try again" button in the Save dialog is unstyled and has no hover

**Steps to reproduce:** right-click an artwork while `/media-originals/*` is blocked (Playwright `route.abort`).

**Actual:** the dialog shows "File unavailable." and then "Failed to fetch" with "Try again" directly beneath it.
- The retry is a bare `<button>`: color `#f3e8ee`, no padding, no border and no underline. Its hover color is unchanged.
- It reads as a second line of body text. It has less affordance than "Back to the artwork", which does get a hover color.
- Retry itself works: it goes back to "Preparing" and then shows the Save button.

This is pre-existing, but this pass restyled every other control in the dialog, so this one is now the odd one out. The raw "Failed to fetch" message also comes from code, not from this pass.

**Evidence:** `ux/save-error.png`, `ux/save-error-retry-hover.png`; `ux/media.json` (`saveError`, `retryHover`, `afterRetry`).

### 5. MINOR: the archive viewer's close, info, prev and next buttons have no hover or pressed state

**Steps to reproduce:** on `/art-by-waambat`, open a tile with its expand control, then hover × or "next".

**Actual:** the color stays `rgb(235,235,235)` at rest, on hover and when pressed. The only feedback is the cursor changing to a hand. Every other control on the site now gets accent hover and pressed states, so this is an inconsistency left over from the pass rather than a regression.

**Evidence:** `ux/archive-viewer-open.png`, `ux/archive-viewer-next-hover.png`; `ux/archive.json` (`closeHover`, `nextHover`).

### 6. MINOR (pre-existing): a server error looks the same as success

**Steps to reproduce:** intercept the contact POST so it returns 500, then 200.

**Actual:** "Your message could not be saved. Please try again." and "Thank you — your message has been received." both render in `#e1bcc2` in the same status region. The text carries the meaning, so this isn't color-only, but the brief asks to keep semantic error/success differentiation. Field-level errors do use `--ui-danger` correctly: a `#ff7070` ring, text below the field, and `aria-describedby`.

**Evidence:** `ux/form-success.png`, `ux/form-error.png`, `ux/form-field-error.png`; `ux/form-status.json`.

### 7. NIT, SUPERSEDED (click effects are being redesigned): the new pressed color on desktop nav links never shows

`Header.module.css` adds `.link:active { color: var(--ui-accent-pressed) }`. `.site-nav-link:hover` in `globals.css` has the same specificity and wins, and with a mouse the link is always hovered while it is pressed. Measured: the pressed color stays `#f1d1d6`. Only the existing `translateY(1px)` applies.

The pressed rules on the menu and close buttons do apply. On touch (CDP `touchStart`) no `:active` color showed either.

**Evidence:** `ux/nav-desktop.json` (`pressed`), `ux/nav-desktop-pressed.png`.

### 8. NIT: invalid fields lose the focus halo when focused

When a field has `aria-invalid="true"`, the danger ring replaces the 1.5px accent ring and the 4px halo, because of the order of the CSS rules. The field is still clearly marked, but the focus indication on it is weaker. This ordering is pre-existing.

**Evidence:** `ux/form-field-error-focused.png`; `ux/form-status.json` (`emailInvalidFocused`).

### Pre-existing issues outside this pass, noted for the owner (unchanged files)

- **Focus is lost on contact submit.** Disabling the `<fieldset>` while the request is pending removes focus from the submit button. `document.activeElement` becomes `<body>` and stays there after success or error. The status region isn't focused either: `focusStatus` only runs on mount. A keyboard user's next Tab lands on the footer "Instagram" link. (`ux/focus-after-submit.mjs`)
- **The pending submit shows the not-allowed cursor.** The whole fieldset is `:disabled`, so the cursor shows not-allowed rather than the `cursor: wait` the CSS declares.
- **The first ArrowDown on the select can skip one option.** After a mouse hover has moved the active index, `openList()` sets `open` before the index updater runs. Measured: the selection was option 2 and the first ArrowDown activated option 3. (`FormSelect.tsx`, unchanged)
- **The mobile pending spinner sits against the next nav label** ("bio ◌collect + contact"). The geometry is unchanged. (`ux/nav-desktop-pending.png`)

## Console

No `pageerror` on any page I exercised. The console errors I saw were:
- Expected errors from my own intercepts: 500, 400 and `ERR_FAILED`.
- The existing `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`.
- `ordinals.com` refusing to be framed (`X-Frame-Options`).
- Vimeo's in-iframe challenge page returning 403 and violating its own CSP in headless Chromium, which also caused the "Sorry, video isn't available" frame.

None of these come from files this pass touched.

## What works well

- **Navigation flow is intact.**
  - Desktop: hover shows a near-white color with the underline growing in. Keyboard focus shows a clear 2px `#e1bcc2` ring with a 6px offset.
  - Pending: the link spinner and the top progress bar (now `#e1bcc2`→`#f1d1d6`) show while the route loads. Arrival lands at scroll 0 with the correct `aria-current`.
- **SUPERSEDED (menu redesign), recorded for round-2 comparison only. The mobile menu at 390px with touch behaves well.** Round 2 must keep these behaviors.
  - Opening focuses "Close menu", locks body scroll and makes the background inert.
  - × and Escape both close it and return focus to Menu.
  - Tapping a destination fades the menu out over the arrived page. The dialog is gone by about 210ms, focus moves to `#main-content`, nothing is left inert, and the new current item is highlighted when the menu reopens.
  - Reduced motion makes the menu animation effectively instant.
- **Contact form:**
  - The hover ring (`#e1bcc2` at 60%), the focus ring with its halo, and the floating label's move and color change all work.
  - The custom select works by mouse, touch and keyboard: arrows, Home/End, Enter, Escape. It closes on an outside tap and returns focus to the combobox, and it keeps the hidden native select in sync.
  - Submit: the hover fills black from the right with pastel text, so it's readable. The pressed scale is the existing one. The pending state shows "Sending…" with a spinner.
  - Field errors show text plus a red ring and are announced through `aria-describedby`.
  - No horizontal overflow at 390px.
- **Media:**
  - Hover on the play/pause and expand controls goes from white to `#f1d1d6` with an accent border. Pressed uses `#c39ca2` with the existing 0.94 scale. Keyboard focus is a 2px `#e1bcc2` ring.
  - The archive viewer opens with focus on Close. Arrow keys page through items. Escape and the close button both return focus to the originating expand button.
  - Ordinal controls: hover, pressed and an `aria-pressed` "on" surface (`#201a1b`). The label text switches between "Interact" and "Exit interaction", so the state isn't conveyed by color alone.
- **Save dialog:** preparing ("Checking the file…" with a spinner), cancel (focus returns, overflow is restored), Escape, error and retry, and the Ready state all work. The Save button runs `#e1bcc2` → `#f1d1d6` → `#c39ca2`, and its `#221014` ink stays readable at 7:1 or better in every state.
- **SUPERSEDED (cursor color and scrollbar redesign), behavior baseline for round 2. Cursor behavior:**
  - The shape changes correctly: default, pointer over links and buttons, text over paragraphs and inputs, and the text shape holds during a drag-select.
  - It hides to the native pointer over iframes. It is `display:none` on touch and coarse pointers.
  - It survives pressing a button and dragging the canvas scrollbar. The rail paints `#f1d1d6` on hover and `#c39ca2` while dragging.
- **SUPERSEDED (the "no glitch" rule was overridden). Motion:** no new bounce, scale, spin or glitch. In round 2, the deliberate glitch effects should still be checked against reduced motion and for readability while inputs are focused. The only new motion is short color transitions. With reduced motion, the cursor sheen, link and submit spinners, label transitions and menu animation are all off.
