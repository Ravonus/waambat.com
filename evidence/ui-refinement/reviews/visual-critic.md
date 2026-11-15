# Visual / design-system critic: WAAMBAT pastel UI pass

Reviewer: an independent visual/design-system critic agent. I did not implement this work and I did not edit any source file.
Revision: branch `polish/pastel-accent-ui`, base 412b456, uncommitted. `git diff -- kerf/src kerf/test` (excluding
`media-downloads.json`) had sha1 prefix `7ce463baaf42` at 17:46 on 2026-11-14. Saved as
`reviews/visual/diff-snapshot-2.patch`. While I was reviewing, the implementer changed one line:
`.option[data-active]` text went from `--ui-accent-hover` to `--ui-accent`. A `MediaDownload.tsx` refactor also
appeared. It is the concurrent media-download task, not this pass, and I did not review it.
Preview: http://localhost:3287 (left running; I did not restart it).

## Scope change during review

The owner changed direction while this review was in progress (relayed by the coordinator; I did not see it from the
owner directly). Three areas are being rebuilt:

1. The cursor and all titles/headings move to the wordmark pink `#ff94b2`.
2. The mobile menu, hamburger, close button and side scrollbar are being redesigned.
3. Hovers, clicks, inputs and menu animations get deliberate datamosh/glitch effects.

Findings in those areas are marked **SUPERSEDED: re-review in round 2**, and I did not investigate them further. The
evidence stays below for reference only. Everything else (forms, links, focus, contrast, Save dialog, admin, layout
fidelity) was reviewed against revision `7ce463baaf42` and remains valid.

| Finding | Status |
|---|---|
| F1 cursor legibility | SUPERSEDED, re-review in round 2. The cursor colour is changing. Re-check its contrast over filled controls and light art in the new colour. |
| F2 select active option | Valid |
| F3 small pastel labels | Valid |
| F4 error/success status colour | Valid |
| F5 one-off color-mix steps | Valid. The rail-focus and nav-underline items fall in superseded areas. |
| F6 admin "waambat" link | Valid |
| F7 kicker inconsistency | Partly superseded: headings are moving to `#ff94b2`, so decide the kickers together with that change. |
| F8 dialog mauve neutrals | Valid |
| F9 sticky hover on mobile Close | SUPERSEDED, re-review in round 2 (the mobile menu is being redesigned) |
| F10 caption-title violet/coral fringe | SUPERSEDED, re-review in round 2 (headings and glitch effects are changing) |
| F11 links vs headings hierarchy | Valid for the link inventory and the underline. The hierarchy judgement must be redone once headings are `#ff94b2`. |
| F12 nav hover vs current page | SUPERSEDED, re-review in round 2 (hover effects are changing) |
| Coverage rows: cursor, canvas rail and native scrollbar, nav hover/underline, mobile menu | SUPERSEDED, re-review in round 2 |

## Method

- **Pixel diff.** I diffed all 64 before/after PNG pairs with sharp. I counted pixels that changed by more than 24 per
  channel, and I counted "coverage flips", where a pixel goes from dark to lit or back. A flip means geometry or glyph
  coverage changed. A pixel that stays lit but changes value means only its colour changed. Outputs:
  `reviews/visual/diff/*.png` (masks: yellow is a colour change, red is a coverage flip) and `diff/summary.json`.
  Side-by-side crops are in `reviews/visual/crops/`.
- **Forced-state scan.** For every `a, button, input, select, textarea, [role=option], [tabindex], label …` on all
  8 public pages plus `/admin`, I forced each state through CDP `CSS.forcePseudoState`: rest, `:hover`,
  `:focus`+`:focus-visible`, `:active`+`:hover` and `:focus-within`. I then read computed colour, background,
  border, outline, box-shadow, text-shadow, filter and accent-color on the element and on its `::before`/`::after`.
  I also scanned every rendered element at rest. Script: `reviews/visual/probe.mjs`. Output: `probe-legacy.json`.
- **Real interactions.** `reviews/visual/states.mjs` → `states.json` and `v-*.png`. It covers the select, submit,
  pending and error states, selection, the cursor, the canvas rail pixels, the route progress bar and skeleton, the
  Save dialog, the mobile menu and admin. `extra.mjs` covers the splash pages, the caption fringe and the cursor over
  light art. `links.mjs` makes a link inventory.
- **Safety.** Every non-GET request was held or aborted inside the browser. One contact POST was held and then aborted
  locally, so no message was sent. Admin is "disabled until authorized sign-in", and I did not bypass it. For the Save
  dialog I used a 4 KB WEBP, hovered Save without clicking it, and closed with "Back to the artwork".

## Findings

### F1. [SUPERSEDED, re-review in round 2] major: the pastel cursor almost disappears over filled pastel controls and light artwork
- **Where:** `/art-by-waambat`, right-click artwork → Save dialog → hover "Save original". The same thing happens
  with the cursor over light regions of artwork, for example the pale wall in the archive (`v-cursor-light.png`).
- **Evidence:** `reviews/visual/v-save-hover.png` and the 4× zoom `crops/save-hover-cursor-zoom.png`. The hand reads
  only as a faint smudge.
  - Cursor shades against the hovered Save fill `#f1d1d6`: base `#e1bcc2` is 1.22:1 and the darkest stop, pressed
    `#c39ca2`, is 1.73:1.
  - The old cursor's dark stop `#c60064` against the old hover fill `#ffb2d1` was 3.50:1.
  - Computed cursor: `repeating-linear-gradient(120deg, #f1d1d6, #e1bcc2, #c39ca2, #e1bcc2, #f1d1d6)` with
    `drop-shadow(#000 1px 1px 0)`. The only edge is a one-sided 1 px black shadow.
- **Source:** `kerf/src/styles/globals.css:147-158` (`.waambat-cursor span`).
- **Why it matters:** the owner named the cursor first. The pass kept its shape and movement, but over the site's
  own primary action (Save original) it stops being findable. The old sheen carried a dark stop that guaranteed an
  edge; the new family has no stop below L≈0.73.
- **Suggested direction (no hue change):** give the glyph a family-ink edge on all sides, for example a second
  `drop-shadow` in `--ui-on-accent` `#221014`, or a `-1px -1px` counterpart. Do not darken the fill.

### F2. minor: the keyboard-active option in the custom select is barely distinguishable
- **Where:** `/contact-waambat`, "What brings you here?" open, active option (pointer or arrow keys).
- **Evidence:** `v-select-hover.png`, `after/state-select-open.png` against `before/state-select-open.png`. Computed
  colours: active bg `#201a1b` on the list bg `color(srgb .0706 .059 .0609)` ≈ `#120f10` is 1.11:1. Active text is
  `#e1bcc2` and inactive text is `#ebebeb`. The text difference is a small hue shift and not a value step. Before,
  the active text was `#ff94b2` on a 12% pink wash.
- **Source:** `kerf/src/components/forms/forms.module.css:206-209`.
- **Why it matters:** this is the one place where a hover/active shade must carry state on its own (there is no
  underline or marker). `--ui-accent-surface-strong` is too close to the list surface for that job. The selected
  option also has only a check glyph and no background (`optionSelected.bg = transparent`).

### F3. minor: at small sizes the pastel reads as grey, so form labels and markers lose their accent role
- **Where:** `/contact-waambat`. This covers the floated labels ("What brings you here?", "Your message *"), the
  required asterisks, and the "* Required" relationship.
- **Evidence:** `crops/desktop-contact-waambat-scrolled-480-400.png` and
  `crops/phone360-contact-waambat-scrolled-0-240.png` (before on top, after below). The asterisk and floated label
  are `#e1bcc2`. Next to `#ebebeb` body text that is 1.45:1, and at 10–11 px the chroma 0.043 hue is not perceptible.
  Before, these were clearly pink.
- **Assessment:** this follows from the owner's muted base, and the asterisk glyph still carries the meaning, so it
  is not an a11y failure. But the form now reads almost monochrome, and "accent" adds nothing to these labels. It
  should be accepted consciously or the owner should be asked about it. It is not a defect to fix by brightening.

### F4. minor: the network-error and success status use the same pastel; `--ui-danger` is not used for it
- **Where:** `/contact-waambat`, submit with the request aborted locally. The status shows "Failed to fetch".
- **Evidence:** `v-form-error.png`. `.status` color is `rgb(225,188,194)`, the same token as the success message.
- **Source:** `kerf/src/components/forms/forms.module.css:377-382` (unchanged by the pass, so this is pre-existing).
- **Why it matters:** the brief asks to "keep necessary semantic error/success differentiation". The pass
  introduced `--ui-danger` but uses it only for field-level `aria-invalid` and `.error`. The text conveys the state,
  so this is minor. Side notes: the raw "Failed to fetch" copy is an existing UX issue. The `--ui-danger` invalid
  frame could not be exercised, because native validation blocks submission and `aria-invalid` is only set from a
  server 400/409. It is unverified.

### F5. minor: one-off `color-mix` percentages bypass the documented steps
- **Where (all derived from `--ui-accent`, so the hue is consistent, but they are not tokens):**
  - `.frame:hover` 60% (forms.module.css:60-63)
  - `.frame:focus-within` background 7% plus a 10% ring (:64-72)
  - `.submit` icon 14%
  - Save hover glow 12% (media-download.css:840)
  - rail focus 7% (scrollbar.css:958)
  - skeleton bone 9% and 4% (navigation.module.css:58, 67)
  - GIF glow 50% (OrdinalCollection.module.css:99-101)
  - gate fringe 53% (globals.css:937-938)
  - nav underline 80% and 67% (globals.css:703-704)
- **Assessment:** the documented family (surface 8%, surface-strong 14%, disabled 40%, border 50%) sits next to about
  ten other mix ratios. Visually they cohere, because hue is pinned at about 7°. As a system, the "one family" claim
  is only partly true at the token level. `--ui-accent-disabled` is used only by `.check:disabled`, and the public
  site has no checkboxes or radios. Disabled buttons still use `opacity: .5` (globals.css:66) and `.8`
  (forms.module.css:362).

### F6. minor: the admin "waambat" text link is logo pink at rest and pastel on hover
- **Where:** `/admin` (the only admin view reachable without sign-in): the small 14 px "waambat" link above
  "Content studio".
- **Evidence:** `v-admin-light.png`. The forced-state scan shows `color #ff94b2` at rest, focus and focus-within, but
  not under `:hover`. Under hover the global `a:hover` turns it `#f1d1d6`.
- **Source:** `kerf/src/routes/admin/index.tsx:12` (`className="text-waambat-logo"`). The public wordmark is
  protected by `a.site-logo:hover`, but this link has no `site-logo` class.
- **Why it matters:** it is either the wordmark, which should stay pink in every state as the header does, or a
  control, which should use the family. Today it is both.
- **Coverage:** the authenticated admin UI (Editor, FormsEditor, ContactInbox and the theme controls) is
  **unverified**, because sign-in is not configured. The `button.text-waambat-link` hover/active rules
  (globals.css:70-75) were checked only in source.

### F7. nit: inconsistent treatment of the two "kicker" labels
- `/ordinals`: the "ARTWORK ON GAMMA" kicker stays `#ff94b2` (`OrdinalCollection.module.css:35`). The Save dialog
  kicker "TAKE A LITTLE WAAMBAT WITH YOU" moved from `#ff94b2` to `--ui-accent`.
- Both are small, tracked, uppercase, non-interactive labels. Keeping the Ordinal one is defensible, since it is not
  interactive. But it is then inconsistent to recolour the dialog kicker and the dialog `h2` (`#ffbfd8` → heading
  pink). Pick one rule. The dialog changes are harmless. The Ordinal kicker sitting under a pastel family and a pink
  stage glow is the last bright-pink text in page content outside the wordmark.

### F8. nit: the Save dialog's neutral text and controls keep a cooler mauve hue
- `.waambat-download` text `#f3e8ee`, copy `#cbb8c3`, info `#9b8793` and the **Cancel control at rest** `#c0aab7` are
  all at OKLCH h ≈ 342°. The accent family sits at h 5.9–7.9°.
- Cancel is interactive, so it starts in an off-family mauve and hovers into the family. The difference is subtle
  (C ≈ 0.03). It is a leftover of the logo-pink era, not a legacy hue from the list.

### F9. [SUPERSEDED, re-review in round 2] nit: sticky touch-hover on the mobile "Close" button
- **Where:** 390 px, tap Menu. The Close button appears under the finger at `#f1d1d6` (hover), not `#e1bcc2`.
  Evidence: `states.json` `mobileMenu`.
- **Source:** `Header.module.css` `.menuButton:hover, .closeButton:hover` has no `@media (hover:hover)` guard.
- **Assessment:** before the pass, rest and hover were both logo pink, so this was invisible. It is now a small
  visible state leak.

### F10. [SUPERSEDED, re-review in round 2] nit: the artwork caption title links keep a violet/coral fringe while scrolling into view
- **Where:** `/` and other artwork lists: the `.original-artwork .artwork-caption h2 a` ("Feels 404", …).
- **Source:** `title-resolve` keyframes at globals.css:898-909, applied at :826-830 with a scroll-driven `view()`
  range of entry 10–70%.
- **Evidence:** at scroll 0 the probe read `text-shadow: #9457ff -1.82px, #ff7070 1.82px` on an off-screen caption
  (fill-mode `both`). In view, after entry, it resolved to transparent.
- **Assessment:** DECISIONS.md calls this the "non-interactive arrival motion of the wordmark and page titles". In
  fact `title-resolve` runs on **clickable caption links**, and because it is scroll-linked, the fringe holds still
  if the user stops scrolling with a caption at the bottom edge. Its window is about 20 px of scroll, so the visual
  impact is small. Keeping the brand "glitch" echo is reasonable. The exclusion should be described accurately.

### F11. nit: links share the heading colour, and hierarchy mostly holds
- **Inventory** (`links.mjs`):
  - Heading links are 26 px/700, 14 px/700 `h3` and `source-heading-link`, all `#e1bcc2`.
  - Inline body links are `source-inline-link`: `#e1bcc2` with a new 1 px underline in `--ui-accent-border`.
  - Utility links (`text-waambat-link`: "View on Instagram ↗", "Open original source ↗") are 12–14 px/300 `#e1bcc2`
    with no underline. They rely on ↗ and their position.
- **Assessment:** hierarchy holds through size and weight. Body text is `#ebebeb`, so an inline link is
  distinguished from body by more than colour only because the underline was added.
- **The new underline is a visible typography change.** It shows as the only coverage flip in the page captures,
  `desktop/tablet/phone*-instagram-top` (352 px). It is justified, because `#e1bcc2` on `#ebebeb` is 1.45:1. Flag it
  to the visual judge as an authorized-by-necessity change rather than a silent one.
- **Pre-existing inconsistency:** `/mechanics` "Open original video ↗" is white 12.25 px, while the same affordance
  on `/blog-press` and `/art-by-waambat` is pastel.

### F12. [SUPERSEDED, re-review in round 2] nit: hover vs current-page in the nav is close in value
- Nav hover `#f1d1d6` against current-page `#ffffff` is 1.42:1. Hover against resting grey `#9c9c9c` is 1.94:1.
- Hover still differs from rest in hue and value, and it gains the split underline (`crops/state-nav-hover-340-80.png`).
  The current page is also underlined. This is acceptable, but on the current-page item, hover barely registers.

## Layout, geometry, typography, artwork

Result: **no unauthorized change found.**

- **All 64 pairs.** Every pair is the same size. In the 48 page captures, all changed pixels except one group are
  colour-only (`coverageFlip = 0`). The changes are confined to:
  - the canvas scrollbar thumb (x 1432–1436 desktop, 352–356 phone);
  - the nav current-page underline (from a violet/coral split to a pastel/pressed split; see
    `crops/desktop-home-top-345-20.png`);
  - the mobile "Menu" label colour;
  - the contact form: fill, labels, asterisks, submit;
  - the Instagram inline link (violet → pastel, plus the underline).
- **The one exception** is the Instagram underline (F11): 352 px of coverage on `*-instagram-top`.
- **Contact (`*-contact-waambat-scrolled`, 4–10 px of coverage).** These are anti-aliasing at the form outline and
  submit pill edge. Field rects, the pill size and the text positions are identical.
- **State shots.** The coverage flips there come from the cursor glyph moving between captures and from video frames.
  `state-ordinals-controls` has 9 231 flips, all inside the playing Ordinal videos (`diff/state-ordinals-controls.png`).
- **Typography.** Font, size, weight, tracking and line breaks are unchanged everywhere I compared.
- **Artwork.** Pixels inside images, video and the Ordinal stage glow are unchanged, apart from video frames.
- **Light/dark OS.** `scheme-light-*` and `scheme-dark-*` are pixel-identical before and after. html `color-scheme`
  computes to `dark` and `accent-color` to `rgb(225,188,194)`.
- **Health.** The overflow report is empty both before and after. There were 15 console errors both before and after,
  all `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin` on `/ordinals`. They are pre-existing, and they leave the "Ordinal A/B"
  broken-image placeholders visible in `state-ordinals-controls`. That is outside this pass.

## Legacy-hue sweep

Every remaining hit from the forced-state and rest scan across 9 routes:

| Hue | Element | Judgement |
|---|---|---|
| `#ff94b2` | header and hero wordmark (`a.site-logo`, `._wordmarkLink`, `h1._wordmark`), every state | Expected exclusion. The brief says to preserve the logo. |
| `#ff94b2` | `/ordinals` "ARTWORK ON GAMMA" kicker | Non-interactive; see F7. |
| `#ff94b2` @30% | `/ordinals` `._stage` box-shadow glow | Artwork framing, which the brief says to preserve. Reasonable. |
| `#ff94b2` | `/admin` "waambat" link at rest and focus | F6. |
| `#9457ff`/`#ff7070` | caption `h2 a` text-shadow (`title-resolve`); `h1` `title-arrive`; hero `hero-wordmark-in` | Arrival/resolve keyframes; see F10. |
| `#ff7070` | `--ui-danger` token | Semantic error colour, always with text. OK. |

- **No hits in any `:hover`, `:focus-visible` or `:active` state** for violet, coral, magenta, `#ff70ba`, `#ffadd1`,
  `#c60064`, `#ff70c5`, `#ffb2d1` or `#ffbfd8` on any control. In source, those hexes survive only in the
  arrival/resolve keyframes and in `theme.ts` `legacyDefaults` (migration data).
- **The contract test is narrower than its name.** It only walks `.css`, `.tsx` and `cursor.ts`, and its regex omits
  `#ff94b2`. The `#ff94b2` uses that I found are all listed above.
- **Legacy splash pages** (`/waambat`, `/lindsay-scoggins`) keep their own palette (`#ffb8c1`, `#e6f5ff`, `#e7dbff`).
  That exclusion is reasonable for recreations. But they are not fully "left as they are": the global `a:hover` now
  turns "On Foundation" `#f1d1d6` over its lavender `#e7dbff` border (it was coral before). That is arguably better,
  but DECISIONS should say so.

## Family coherence

The computed tokens on every route match DECISIONS.md, and the contrast claims hold:

| Token | Value | Contrast | OKLCH |
|---|---|---|---|
| base | `#e1bcc2` | 12.17:1 on black | L 0.829, C 0.043, h 7.1° |
| hover | `#f1d1d6` | 14.83:1 on black | L 0.889, C 0.036, h 7.2° |
| pressed | `#c39ca2` | 8.60:1 on black | L 0.730, C 0.047, h 7.9° |
| border | `#715e61` | 3.48:1 on black; 3.16:1 on the dialog surface | h 7.3° |
| on-accent ink | `#221014` | 10.57:1 on base, 12.87:1 on hover, 7.46:1 on pressed | h 5.9° |

All shades sit within 2° of hue. This is a genuinely single-hue ramp, and it reads as one family. Two caveats:

- The ramp is short at the dark end, which is what causes F1.
- At small sizes the low chroma reads as warm grey (F3).

## Coverage checklist

| Area | Result | Evidence |
|---|---|---|
| Cursor (fine pointer) | Family gradient, shape kept, `cursorState: pointer` works | `after/state-cursor-*.png`; F1 |
| Nav hover / underline / pending | Hover `#f1d1d6`; underline split in pressed/hover shades; pending link `#e1bcc2` with spinner | `v-nav-pending.png` |
| Buttons | Submit: rest base with ink. Hover inverts to black with base text. Focus has a 2 px base outline. Pending `opacity .8`. | `states.json` |
| Fields | Hover 60% ring; focus 1.5 px base plus 10% halo | `after/state-field-focus.png` |
| Custom select | Border token, active surface; selected shows a check glyph only | F2 |
| Checkbox/radio | **None rendered on public pages**; source only | — |
| Progress bar | Gradient from transparent through base to hover | top-right of `v-nav-pending.png` |
| Skeleton | Line `#201a1b`; art `#120f10`→`#201a1b` | `states.json` `progress` |
| Canvas rail | Pixels read from the canvas: rest `#e1bcc2`, hover `#f1d1d6`, drag `#c39ca2`. Focus: 1 px base outline with a 7% wash. Native fallback reads the tokens. | `states.json` `railRest`/`railHover`/`railActive` |
| Save dialog | Surface `#120f10`; border `#715e61`; close and kicker base. Save base with ink, hovering to `#f1d1d6` with a 12% glow. Focus outline base 2 px. Cancel `#c0aab7` → hover. Closes correctly. | `v-save-dialog.png`, `v-save-hover.png`, `v-save-focus.png` |
| Media / Ordinal controls | Media hover border base; Ordinal action hover `#f1d1d6` text with base border; pressed uses the pressed shade | `after/state-media-control-hover.png`, `states.json` |
| Selection | `::selection` bg `#e1bcc2`, ink `#221014` | `v-selection.png` |

The implementer's `state-selection.png` does not actually show a selection: the clip misses the selected node. Use
`reviews/visual/v-selection.png` instead.

## What is good

- **No layout, geometry, typography or artwork regression.** All 64 pairs match in size, and every page-level change
  is colour-only, except one justified underline.
- **One real family.** The hue is pinned at about 7° in OKLCH and moves along lightness only. Hover and pressed never
  jump hue. Nothing in any forced interactive state on 9 routes resolves to violet, coral, magenta or any other
  listed legacy hue.
- **Contrast.** The base, hover and pressed shades and the on-accent ink all exceed the claimed contrast. Filled
  controls use a family-tinted ink instead of pure black.
- **Shared tokens.** The canvas rail, the native scrollbar fallback, the Save dialog, the skeletons, the progress bar,
  `::selection`, the focus rings and the cursor all read the same tokens. The rail pixels were verified on the canvas
  itself.
- **Brand exclusions.** The wordmark keeps its logo pink in every state on the public site. `color-scheme: dark`
  keeps light-OS renders identical.
- **Theme migration.** It is conservative: only exact legacy defaults are remapped.

**Verdict from this critic (round 1, revision `7ce463baaf42`):**

- The only major finding, F1 (cursor), is superseded by the owner's new direction.
- In the areas that remain valid there are no blockers or majors. F2–F6 are minor and should be fixed or explicitly
  accepted by the owner. F7, F8 and F11 are polish.
- This is not an approval of the round-2 work. Round 2 must re-review:
  - the `#ff94b2` cursor and headings, including cursor contrast over filled pastel controls and over pink headings;
  - the redesigned mobile menu, hamburger, close button and scrollbar;
  - the glitch/datamosh effects, including reduced-motion behaviour and whether they count as "new glitch effects"
    against the original brief;
  - link/heading hierarchy once headings and links no longer share a colour.
- **Note for round 2:** with headings and cursor moving back to `#ff94b2`, the "single pastel family" premise of
  DECISIONS.md changes. The doc and the contract test (which pins `link === heading === #e1bcc2`) will need updating
  to match.
