# Round-2 critic: WAAMBAT UI pass (visual, interaction, accessibility)

I'm an independent critic. I didn't implement this pass and I didn't edit any source file.

- **Branch:** `polish/pastel-accent-ui`, uncommitted, base 412b456.
- **Preview:** http://localhost:3287 (headless Chromium through playwright-core 1.64.1, axe-core 4.14.0), 2026-11-14 17:57–18:35.
- **Revision.** The fingerprint is `git diff -- kerf/src kerf/test ':!kerf/src/content/media-downloads.json' | shasum`.
  - It was `d3b4f39ace92` at the start, saved as `reviews/round2/diff-snapshot.patch`.
  - It was `c52fbb0b1df0` at the end. That revision added the scroll-glitching rail, the wordmark hover, the `.arrive` fix for the menu-link blink, and the archive viewer change.
  - Everything that could have changed was re-measured on `c52fbb0b1df0`: menu, bursts, loop, tap-hold, calm mode, cursor keyline, rail, axe, titles and archive. Results from before the update are kept in `reviews/round2/pre-update/`.
- **Scripts and screenshots:** `evidence/ui-refinement/reviews/round2/` (`*.mjs`, `*.json`, `shots/`). Each script runs with `node <script>.mjs`.
- **Safety:**
  - No contact message was sent. One submit was **held** (never fulfilled) to see the pending state. One was **fulfilled locally** with a fake 500. All other non-GET requests were aborted.
  - GETs of `/media-originals/*` were aborted, so no original was downloaded.
  - I didn't attempt to log in to admin.
  - To test the studio's **calm** and **off** motion settings, I set `data-motion` on the live DOM of my own headless page. I didn't change any stored setting.

## Verdict

The new direction is visually on-brand. The redesigned mobile menu is a real improvement. The two-pink datamosh vocabulary reads as WAAMBAT. Reduced motion is handled thoroughly.

But the effect layer has three blocking interaction defects, and all three come from how the bursts are built rather than from taste:
- **Hover bursts strobe in a loop.** The bursts animate `clip-path` on the hovered or pressed element itself, so the pointer falls off the element mid-burst. Every desktop text hover becomes a 7.5–10 Hz strobe for as long as the pointer rests on it.
- **Presses fail.** A press of ordinary length (60–130 ms) on a link sometimes doesn't activate it.
- **Calm mode locks the site.** With the studio's "calm" motion setting, the mobile menu can't be closed and leaves the page inert.

Separately, the cursor "keyline" that is meant to fix the round-1 cursor-camouflage major is never painted.

**Not approvable until B1–B3 and M1 are fixed.**

## Findings

### B1. BLOCKER: hover bursts re-trigger themselves in a continuous 7.5–10 Hz loop

**Where:** desktop nav links, the current nav link, artwork caption titles, inline links, and mobile-menu links with a mouse (for example at 200% zoom).

**Steps:**
1. Open `/contact-waambat` at 1440.
2. Move the pointer onto "art archive" and leave it still.

**Measured** (`loop.mjs` → `loop.json`; pointer parked at 10/30/50/70/90% of the link height for 2 s):

| Target | Bursts started in 2 s |
|---|---|
| desktop nav | 20 / 15 / 16 / 20 / 20 |
| current nav | 21 / 16 / 16 / 21 / 21 |
| caption title | 20 / 15 / 16 / 20 / 20 |
| inline link | 20 / 15 / 16 / 20 / 20 |
| menu link at 200% zoom | 20 / 15 / 16 / 20 / 20 |
| media control (box burst, no clip) | 1 |
| wordmark (wider clip margins) | 1–2 |
| reduced motion | 0 |

- The rAF trace in `mosh.json` `navHoverSample` shows a new cycle every ~120–135 ms.
- After 2 s of hovering, the animation is still `running` (`navHoverAfter2s`).
- Moving across the nav makes the last link keep firing: 11 starts for 8 links (`navSweepStarts`).

**Cause:** `waambat-mosh-text` animates `clip-path` on the link itself (`inset(16% … 36%)`, then `inset(54% … -40%)`). Hit-testing honours `clip-path`, so:
1. the strip under the pointer gets clipped away;
2. `:hover` drops and the animation is removed;
3. the clip disappears, `:hover` returns, and the animation restarts.

**Flash (WCAG 2.3.1):** measured from real 60 fps screencast frames (`flash.mjs` → `flash.json`).
- The loop produces up to **16 luminance flashes per second** per pixel.
- The flashing area is only 0.5% (nav), 1.2% (caption) and 1.6% (menu link at 200% zoom) of a 10° field. That is far below the 25% general-flash area, so this is **not** a 2.3.1 AA failure.
- It does fail 2.3.2 (AAA). It contradicts the owner's own spec ("one shot … never looping", DECISIONS §6). The hovered word is unreadable for as long as the pointer stays on it.

**Evidence:**
- `shots/loop-desktop-nav.png`, `shots/sheet-mosh-nav.png`
- `shots/flash-nav-hover-rest-mask.png`
- (Ignore the large blob in that mask. It is the contact page's own artwork video, not UI. See "out of scope".)

**Fix direction:** don't clip the hit-test box. Either run the slices on a pseudo-element or child span (the `.arrive` pattern the menu now uses), or drop `clip-path` from the hover and press keyframes and keep the shadows and translate.

### B2. BLOCKER: press bursts swallow link activation on touch and mouse

**Steps:** press a link for a realistic duration (`taphold.mjs` → `taphold.json`). Results were re-run on the final revision and are identical.

| Case | Hold | At 30% of height | At 50% | At 75% |
|---|---|---|---|---|
| Touch, 390, mobile menu "bio" | 60 ms | ok | ok | **FAIL** |
| | 100 ms | **FAIL** | **FAIL** | ok |
| | 130 ms | **FAIL** | **FAIL** | ok |
| | 20, 180, 300 ms | ok | ok | ok |
| Mouse, 1440, desktop nav "bio" | 60 ms | **FAIL** | **FAIL** | ok |
| | 100 ms | ok | ok | **FAIL** |
| | 130 ms | ok | ok | ok |
| Reduced motion, touch | 100 / 130 ms (at 50%) | — | ok | — |

**Cause:**
- `src/lib/mosh.ts` sets `data-mosh-burst` on pointerdown.
- `a[data-mosh-burst]` then runs `waambat-mosh-text` with `clip-path`.
- When the finger lifts or the mouse button comes up during a clipped frame, the hit-test misses the link, so the tap or click goes elsewhere and nothing navigates.

A typical finger tap lasts 80–150 ms, which sits squarely in the failing window. Same fix as B1.

### B3. BLOCKER (latent, "calm" motion setting): the mobile menu can't close and the page stays inert

**Steps:**
1. 390 touch, `/mechanics`.
2. Set the theme motion to `calm`. This is a real admin option: ThemeEditor's "Theme motion energy". I applied it to the DOM for this test.
3. Open the menu, then close it with ×, with Escape, or by tapping "bio".

**Measured on the final revision** (`followup.mjs` → `followup.json`): all three paths leave the menu stuck with
- `phase: "closing"`, overlay opacity 0;
- `main#main-content` and `footer` **inert**;
- `aria-expanded="true"`, and the Menu button `visibility: hidden`;
- html `overflow: hidden` after × or Escape.

The page shows but can't be used. After "bio", the URL changes to `/bio-waambat` and the new page is dead. On the first revision, × occasionally worked; on the final revision all three failed. Under reduced motion and under `off`, closing works (12–101 ms; `reduced.json`).

**Evidence:** `shots/calm-stuck-destination.png` (no hamburger, page inert), `shots/reduced-menu-calm-after-x-600ms.png`.

**Cause:**
- The calm rules reuse the keyframe name: `menu-fade 240ms` to open and `menu-fade 200ms reverse` to close. Changing only the duration and direction doesn't restart an animation, so no `animationend` fires.
- `Header.tsx` only shortcuts `nav.finish` when `animationName === 'none'`.
- **This is a regression.** The baseline had no calm override and used distinct `menu-enter` and `menu-exit` names.

### M1. MAJOR (round-1 major, still open): the cursor's dark keyline is never painted, so the cursor vanishes over titles, the Save button and the pending submit

The claim in DECISIONS §1 ("A dark keyline keeps it readable…") is not true in the browser.

**Cause:** `effects.css` puts the four black `drop-shadow`s on `.waambat-cursor span`. That same element carries the `mask-image` glyph. CSS applies `filter` before `mask`, so the mask clips the keyline away. It also clips the press-split drop-shadows: the "cursor splits on press" effect shows only a 2 px jitter (`shots/cursor-press-split-zoom.png`).

**Measured** (`keyline.mjs` → `keyline.json`). Near-black pixels around the arrow:

| Background | Live CSS | Same filter moved to the parent `.waambat-cursor` |
|---|---|---|
| white | 0 | 399 |
| `#ff94b2` | 0 | 408 |
| `#f1d1d6` | 0 | 403 |

Evidence: `shots/sheet-keyline.png`.

**In context** (`cursor.mjs` → `cursor.json`, `shots/sheet-cursor.png`):

| Where | Cursor against what's underneath |
|---|---|
| I-beam over `#ff94b2` titles | 1.0–1.45:1 (base and deep steps) |
| Hand over the hovered Save button (`#f1d1d6`) | median 1.62:1, keyline pixels 0 |
| "Not-allowed" ring over the pending "Sending…" fill | 1.3:1 |
| Light artwork | median 2.8:1, minimum 1.0:1 |

Making titles the same pink as the cursor made the round-1 problem worse. Moving the filter to the parent (or to a wrapper) fixes it, as shown above.

The **shapes and fallback** work: pointer, text and not-allowed states are correct, and iframes get the native pointer. With the popover hidden, the native `cursor: pointer` returns. On touch the cursor is `display: none`.

### M2. MAJOR, observed but outside this UI pass: broken-image placeholders

**Where:**
- `/mechanics`: "quantum mechanics" ×2–3.
- `/blog-press`: "blog + press" ×4 on the first revision; 0 on a later re-run, so it's intermittent.

**What:** an `<img>` inside `ArtworkCard`'s `PICTURE.block` gets the page URL as its `src` (`broken-images.json`, `shots/sheet-pages-1440.png`). That is an empty poster passed to the new `VideoStill` fallback.

This looks like the concurrent first-frame/VideoStill work, not the palette/motion pass. I haven't scored it against this pass, but it is visible on two pages.

### m1. MINOR: at 200% zoom the menu's × scrolls out of view

**Steps:** 720×450 at device scale factor 2. Open the menu and scroll the panel (604 px of content in 450 px).

**Measured:** the "fixed" close button ends up at y = −118 (`menu.json` `z200.scrolledPanel`, `shots/sheet-menu-z200b.png`).

**Cause:** the overlay's `menu-mosh-in` fill leaves `translate: 0 0`, which creates a containing block for `position: fixed` children.

Escape still works, and Tab reaches the × (focusing it scrolls it back), so this is minor. A second, unnamed focus stop appears at this size: the scrollable `<dialog>` itself (nit).

### m2. MINOR (owner decision): wordmark pink now covers more than titles

**Measured** (`pages.mjs` → `pages.json`): every h1/h2/h3 on all eight pages is `#ff94b2` (0 misses). The text that also went `#ff94b2` falls into three groups:
- **Body-length copy.** On `/mechanics` and `/contact-waambat`, several paragraphs are authored as heading blocks (`h3.source-small-heading`, 14px/700). They now read as a wall of saturated pink (`shots/cmp-mechanics-phone390-before-after.png`). That follows from "titles are pink", but it changes the page's weight more than any other edit in the pass. Ask the owner.
- **Non-titles in pink, contrary to DECISIONS §2** ("only titles change"):
  - the contact list labels (`span.source-list-label`) and their links;
  - the form's floated labels and the `*` required mark. DECISIONS later says these are deliberately wordmark pink, so the doc contradicts itself.
  - the Ordinals "Artwork on Gamma" kicker.
- **Latent, not rendered in my pass:** `InstagramCard` "Featured", the `VideoEmbed` play button (`text-waambat-pink`), and the admin `LoginForm` and OAuth buttons (`border-waambat-pink`). DECISIONS says the admin action buttons moved to pastel.

**Hierarchy is still coherent:**
- titles `#ff94b2`;
- links and controls pastel `#e1bcc2` (title vs link 1.20:1, separated by size, weight and the underline);
- body `#ebebeb` (title vs body 1.74:1, plus weight and size);
- nav grey `#9c9c9c`, current white, hover `#ff94b2` (hover vs current 2.07:1). This fixes round-1 F12 and UX #2.

### m3. MINOR: the destination close is slower than round 1

**Measured:** after tapping "bio", the menu stays fully open for about 130 ms after the URL changes, then wipes out. It is gone at 630–730 ms after the tap (`menu.json` `destination.trace`). Round 1 was about 210 ms.

Arrival is otherwise correct: focus lands on `main#main-content`, the scroll lock releases, and "07 bio" is current when the menu reopens.

### m4. MINOR: two glitch vocabularies

- All the new bursts use the two pinks.
- The h1 `title-arrive` and caption `title-resolve` still use the violet/coral fringe (`#9457ff`/`#ff7070`, `globals.css` 887–935).

Now that titles are wordmark pink and the brief is "make it look more WAAMBAT", the violet/coral arrival is the odd one out.

### m5. MINOR (still open from round 1): client-side validation leaves `aria-invalid="false"`

On empty submit the three required fields match `:user-invalid`, but `aria-invalid` stays `"false"` (`r1check.json`). This is pre-existing.

### Nits

- **Menu index numerals.** `#715e61` on black is 3.48:1 at 11px. They are `aria-hidden` and decorative.
- **Desktop nav pressed colour.** The deep step never shows: pressed reads `#ff94b2` (`r1check.json`). The box/text burst now carries the press feedback.
- **Rail at rest.** It is flat `#ff94b2`. The gradient appears only on hover, drag or scroll, while DECISIONS says "gradient thumb".
- **Scroll-glitch rail.** It is on-brand and decays in about 0.4 s (22 frames at ×0.84). It is off under reduced motion and calm (`newbits.json`).
  - Its per-frame `Math.random()` shear makes it busy during long scrolls: up to 14 flashes/s on 781 px, 0.5% of the field (`flash.json` `rail-scroll-1440`).
  - It passes 2.3.1. Consider a seeded or less frequent shear.
- **Save dialog Cancel** is still mauve `#c0aab7` (round-1 F8).
- **Hamburger press on emulated touch.** The 0.9 scale wasn't observed 70 ms into the press (the burst was). Probably a touch-emulation `:active` delay. Unverified.

## Round-1 findings: rechecked

| Round-1 finding | Status (browser-verified unless noted) |
|---|---|
| a11y M1 / UX 3 / visual F2: select active option | **Fixed.** 20% fill (1.53:1 vs the list), 3 px `#ff94b2` inset bar (9.2:1), pink text (5.99:1 on the row). In forced colors: 2px Highlight outline. `shots/r1-select-active-forced-*.png` |
| a11y M2: field focus in forced colors | **Fixed.** 2px Highlight outline |
| a11y m3: `aria-invalid` on client validation | Open (m5) |
| a11y m4: heading-embedded link | **Fixed.** "(in discord)" is underlined |
| UX 1 / visual F1: cursor camouflage | **Open, and worse** (M1) |
| UX 2 / F12: nav hover looks current | **Fixed.** Pink hover vs white current |
| UX 4: Save "Try again" unstyled | Styled in source (`.waambat-download-retry`). Live: couldn't force the error, because the dialog still reached "Ready". **Unverified** |
| UX 5: archive viewer hover | **Fixed.** Close hover `#f1d1d6` |
| UX 6 / F4: error looks like success | **Fixed.** A fake 500 shows `#ff7070`, `data-tone="error"` |
| UX 7: nav pressed colour | Still not visible (nit) |
| F6: admin wordmark hover | **Fixed.** Stays `#ff94b2` |
| F9: sticky touch hover on Close | **Fixed.** Hover is gated by `(hover:hover)` |
| F8: mauve Cancel | Open (nit) |

## Late-revision items (`c52fbb0b1df0`)

- **(3) Menu titles blinking out on mouse-out: fixed.** Before the fix, hover-out, touch-cancel and keyboard blur each replayed the link's arrival: opacity 0 for about 170 ms (`pre-update/menu.json`, `shots/menu-fine390-link-unhover-replay.png`). After the fix, the link holds opacity 1 throughout in all three cases.
- **(4) Archive viewer: works.** Tested at 390, 844×390 landscape and 1440 (`archive.mjs` → `archive.json`):
  - the frame fits the viewport in every case;
  - it takes each item's ratio (0.5625, 1.777, 1.333) and reshapes on next;
  - Vimeo sources show the poster with "Video unavailable · Open original source ↗" (`shots/archive-390-2.png`).
  - At 1440 the height caps at 600 px.
- **(1) Rail glitch: works.** Off under reduced motion and calm, and settles to the clean thumb.
- **(2) Wordmark hover.** It holds a pink/pastel split with a glow and stays `#ff94b2`. The burst flashes on 0 px above threshold. It fires 1–2× per hover (the wider clip margins mostly avoid B1). Because it's a static filter, it still shows under reduced motion, which is fine. `shots/new-wordmark-hover-full.png`

## What works

- **The mobile menu redesign is genuinely better** (`shots/menu-p390-open.png`, `shots/sheet-menu-p390-open.png`):
  - 28px light pastel links with mono indices;
  - the current page in wordmark pink with the split underline;
  - the slice scan-in and the pink tear look deliberate and WAAMBAT;
  - the hamburger shears on hover and the × folds from the same strokes. The × centre matches the hamburger exactly: (318,58) at 360, (348,58) at 390, (678,58) at 720.
- **Menu mechanics** (360, 390, 200% zoom):
  - focus goes to Close; Tab is trapped (the cycle includes the one visible wordmark);
  - × and Escape return focus to Menu;
  - scroll lock, with `main` and `footer` inert;
  - a single wordmark stays visible above the panel (hit-test confirmed);
  - links are 52px tall and none are clipped;
  - no overflow at any width.
  - At 768 and in landscape (844) the desktop nav is used, as before.
- **Menu open/close flash** is well under 2.3.1: at most 5 flashes in 1 s on 266 px when opening, and 4 on 89 px when closing.
- **Reduced motion is excellent** (`reduced.json`): no idle animations, no hover, press, field or cursor bursts, no menu slices, no cursor sheen, no rail split or scroll glitch, and the menu closes instantly. The `off` setting also behaves.
- **Burst taste, one shot at a time:** readable again by about 150 ms and clean by 280 ms; layout shift 0.00006 (translate only).
  - The field tear is subtle and lands on the focus ring (`shots/sheet-mosh-field.png`).
  - Option, submit and media-control press bursts look good.
- **Canvas rail:** `#ff94b2` at rest, light gradient on hover, split while dragging (deep left, pastel right). Keyboard works (Arrow +40, PageDown +850, End, Home). Focus is a 1px pink outline with an 8% wash. The native fallback is `scrollbar-color: #ff94b2 #120f10` (thin). It hides while the menu is open.
- **axe-core** on all 8 pages at 1440 and 390: only the pre-existing `region` (the scroll rail) and `page-has-heading-one` (`/art-by-waambat`).
- **Console:** no `pageerror`. The only errors are the pre-existing `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`, third-party Vimeo/YouTube/Instagram noise, and failures from my own aborted requests.

## Out of scope, noted

On `/contact-waambat`, the artwork video itself exceeded the general-flash area in my screencast: 0.35 of a 10° field above 3 flashes/s (`shots/flash-nav-hover-rest-mask.png`). That is artist media, not UI. Mention it to the owner only if photosensitivity matters for that piece.

## Scores (final revision `c52fbb0b1df0`)

| Category | Score | Why |
|---|---|---|
| Design fidelity (same site) | **7/10** | Pages, geometry, artwork and copy are unchanged. The menu redesign stays within the same model, position and single logo. It loses points for the heading-typed body copy that now dominates `/mechanics` and `/contact` in hot pink (m2), and for the leftover violet/coral arrival fringe (m4). The broken placeholders (M2) aren't counted. |
| Palette consistency | **7/10** | The two-pink system (titles, cursor, rail, current page in `#ff94b2`; links and controls pastel) is clean and tokenised, and every interactive state stays in family. It loses points for wordmark pink on labels and kickers contrary to DECISIONS, the old arrival hues, mauve Cancel, and latent `text-waambat-pink` on non-titles. |
| Interaction quality | **3/10** | Three blockers. Every desktop text hover strobes until the pointer moves (B1). Normal-length presses sometimes do nothing (B2). Calm mode bricks the phone menu (B3). The cursor disappears over titles and the Save button (M1). The underlying craft (menu, field tear, rail, archive viewer) would score much higher once B1–B3 and M1 are fixed. |
| Accessibility / responsiveness | **4/10** | Reduced motion, focus management, the trap, return focus, axe, overflow and contrast of text states are strong. Against that: unreliable activation (B2), a continuous strobe under the pointer (fails 2.3.2 AAA; passes 2.3.1 AA by area), a lock-out in calm mode (B3), the close control lost at 200% zoom (m1), and pointer visibility (M1). |

## Evidence index

All paths are under `evidence/ui-refinement/reviews/round2/`.

| Area | Files |
|---|---|
| Menu | `menu.mjs`, `menu.json`, `shots/menu-*`, `shots/sheet-menu-*`, `shots/sheet-hamburger-states.png` |
| Bursts | `mosh.mjs`, `mosh.json`, `shots/mosh-*`, `shots/sheet-mosh-*` |
| Hover loop | `loop.mjs`, `loop.json`, `shots/loop-*` |
| Activation | `taphold.mjs`, `taphold.json` |
| Flash | `flash.mjs`, `flash.json`, `shots/flash-*` |
| Reduced motion, calm, off | `reduced.mjs`, `reduced.json`, `followup.mjs`, `followup.json`, `shots/reduced-*`, `shots/calm-stuck-*` |
| Cursor | `cursor.mjs`, `cursor.json`, `keyline.mjs`, `keyline.json`, `shots/cursor-*`, `shots/sheet-cursor.png`, `shots/sheet-keyline.png` |
| Rail | `rail.mjs`, `rail.json`, `shots/rail-*`, `newbits.mjs`, `newbits.json`, `shots/new-*` |
| Titles, axe, console | `pages.mjs`, `pages.json`, `shots/page-1440-*`, `shots/cmp-mechanics-phone390-before-after.png` |
| Round-1 rechecks | `r1check.mjs`, `r1check.json`, `shots/r1-*` |
| Archive viewer | `archive.mjs`, `archive.json`, `shots/archive-*` |
| Broken images | `broken.mjs`, `broken-images.json` |
| Pre-update results | `pre-update/*.json` |
