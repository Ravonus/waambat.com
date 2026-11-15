# Independent visual judge: WAAMBAT UI refinement pass

I'm an independent judge. I didn't implement this pass, I didn't edit any source file, and I didn't take the implementer's
DECISIONS.md or the critics' reports as fact. Everything below was measured in a browser.

- **Preview:** http://localhost:3287, left running. Headless Chromium through playwright-core 1.64.1 and axe-core 4.14.0, 2026-11-14 18:54–19:16 MST. Load average stayed between 7 and 12, and I ran one browser at a time.
- **Revision.** The fingerprint is `git diff -- src test ':!src/content/media-downloads.json' | shasum`.
  - It was `a6d10088fe7c` at the start and `205c325b8c53` at the end.
  - **The source changed while I was judging.** Another worker edited `InlineVideo.tsx` and `adaptive-media.ts` (19:02), `OrdinalPiece.tsx` (19:06), `VideoEmbed.tsx` (19:07), `local-streams.json` (19:10) and `first-frames.json` (18:57).
  - The 19:07 edit reloaded the page under my first video sweep. I re-ran that sweep afterwards, with zero reloads.
  - None of the changed files are styles, the header/menu, `effects.css` or `mosh.ts`. So the menu, burst and tap results, taken around 19:02–19:06, still apply to those components.
  - Video, cursor, Save, axe, zoom, forced-colors, CLS and archive were measured on `205c325b8c53` or later.
- **Scripts:** `evidence/ui-refinement/reviews/judge-visual/*.mjs`, with results in `*.json`.
- **Screenshots:** `judge-visual/shots/`. Fresh captures are in `shots/now/`; before/now side-by-side sheets are in `shots/cmp/`.
- **Safety:**
  - Every non-GET request and every `/media-originals/*` request was aborted by a route guard.
  - The contact form was never submitted. I didn't even press submit, so client-side `aria-invalid` is **unverified** by me.
  - **Admin is unverified.** I didn't attempt to log in.
  - Calm and off motion were tested by setting `data-motion` on my own page's DOM. No stored setting was changed.

## Scores

| Category | Score |
|---|---|
| 1. Design fidelity | **7 / 10** |
| 2. Palette consistency | **7 / 10** |
| 3. Interaction quality | **9 / 10** |
| 4. Accessibility and responsiveness | **8 / 10** |

**Verdict: FAIL.** Design fidelity and palette are both below the ≥8 bar.

Interaction, which was the blocking area in round 2, is now strong. B1, B2, B3, M1 and m1 are all fixed by measurement.

---

## 1. Design fidelity: 7/10

**What holds** (`pages.mjs`, `shots/cmp/*.png`; 8 pages × 360/390/768/1440 × top and scrolled, same settings as the baseline capture):
- Geometry, nav placement, wordmark, content widths, typography, copy and artwork framing match the baseline on every sheet I inspected:
  - home, mechanics, contact, ordinals, bio, archive, blog, and phone contact scrolled;
  - for example `cmp/desktop-contact-waambat-top.png`, `cmp/tablet-ordinals-top.png` and `cmp/desktop-bio-waambat-top.png`.
- Horizontal overflow is 0 on all 32 page/width combinations.
- The only visible differences are the owner-directed ones:
  - titles in `#ff94b2`;
  - a white current-nav underline, where the baseline's was violet;
  - the hamburger centred on the wordmark;
  - first-frame stills (the home hero now opens on the AVIF first frame, `shots/hero-*.png`; bio now shows a still where the baseline showed a blank, `cmp/desktop-bio-waambat-top.png`).
- The menu redesign keeps the same model, destinations and button position. One wordmark stays visible (`shots/menu-open-900ms.png`).

**/mechanics vs waambat.com/mechanics** (`mechanics.mjs`, `mechanics.json`, `shots/mech-cmp-1512.png`, `shots/mech-orig-*.png`, `shots/mech-local-*.png`):

| Block (1512 wide) | Original x, w×h | Local x, w×h |
|---|---|---|
| Quantum video slot (dead imgur) | 442, 629×150 | 442, 629×150 |
| MECHANICS image | 450, 612×558 | 450, 612×558 ✓ |
| WL image | 476, 560×566 | 476, 560×566 ✓ |
| **8oZCxzC "G1 153 editions" video** | 442, **629×629** | 442, **629×150** at the reduced-motion capture; 629×629 once the video loads at full motion (`mech2.json`) |
| TBObuJ0 slot (dead) | 442, 629×150 | 442, 629×150 |
| Quantum Collection image | 276, 960×3300 | 276, 960×3300 ✓ |

Block order is identical. At 390 every column matches too (350 wide), except G1 again: 350×150 against 350×350.

**Defects that cost points:**
- **G1 video collapses to a 150px strip under reduced motion.** It shows as a small thumbnail in a letterbox (`shots/mech-local-g1-slot.png`). The original is a 629×629 square.
  - This happens at 1512 and at 390. Under reduced motion the `<video>` never mounts, and the slot keeps the 150px placeholder height instead of the media's 1:1 ratio.
  - This is the one page the owner asked to match, and it doesn't match for reduced-motion visitors.
  - Under full motion the page grows by 479px when the video arrives. CLS while scrolling stayed ≤0.0004, because the jump happens below the fold.
- **Dead-video fallback differs by motion mode.**
  - Full motion shows "Video could not load / Open original video ↗" (`shots/mech2-no-preference-300.png`).
  - Reduced motion shows an empty box with a play button that can't play (`cmp/phone390-mechanics-top.png`).
  - The original is just blank, so the full-motion version is an acceptable improvement. The reduced-motion one is not.
- **Weight shift from pink headings** (owner-directed, but heavy). Long heading-typed passages now read as saturated pink:
  - the blog subtitle "Gretchen Andrew and WAAMBAT tell Cody Edison…", five lines at 390 (`cmp/phone390-blog-press-top.png`);
  - "Below are WAAMBAT's unedited responses…" on bio.
  - The original site has these in the pale `#e1bcc2`.
- **Fonts on /mechanics differ from waambat.com.** The original's headings are a lighter geometric sans (`mech-cmp-1512.png`), and two text blocks wrap one line longer locally. This predates the pass (the baseline uses the same local font), so I count it lightly.
- **Media worker, outside the UI pass:** with reduced motion, the "Hans Zimmer (2017)" archive tile's first-frame still is solid black (`shots/archive-reduce-900.png`). It plays correctly at full motion (`shots/archive-no-preference-900.png`).

## 2. Palette consistency: 7/10

**Measured** (`palette.mjs`, `palette.json`). For every link and button in view on all 8 pages at 1440, I recorded the default colour, the hover colour after 260ms, and the Tab focus ring:

| Colour | Uses | Role |
|---|---|---|
| `#e1bcc2` (h350 s.38 l.81) | 340 | links, controls, focus rings |
| `#ff94b2` (h343) | 47 | nav hover, current-page index, cursor, rail, titles |
| `#f1d1d6` (h351) | 21 | link and caption hover |
| `#9c9c9c` / `#ffffff` / `#ebebeb` | – | nav at rest, current page, body |

No interactive state in these samples reached `#9457ff`, `#ff7070` or `#fa75d0`. All accent hues sit within 343–351°, which is one family.

- **Contact form.** Fields show `inset 0 0 0 1.5px #e1bcc2` plus a 10% halo on focus (`shots/form-field-focus.png`). The submit is `#e1bcc2` fill with `#221014` ink, and it turns to the outlined pastel on hover (`shots/form-submit-hover.png`). The select's active option has a 20% fill, a 3px `#ff94b2` bar and pink text (`shots/form-select-open.png`). `accent-color` is `#e1bcc2` and `color-scheme` is `dark` on every control.
- **Owner pinks.**
  - **Cursor.** The cursor is in the wordmark-pink sheen (`shots/cursor-*.png`).
  - **Rail.**
    - At rest it is `≈#f090b0`.
    - On hover it adds a lighter gradient.
    - While dragged it splits deep and light (`≈#e07090` / `#a05060`); see `shots/rail-rest.png`, `rail-hover.png` and `rail-drag.png`. Drag-scroll works: a 100px drag scrolled the page 1,979px.
  - **Titles and nav hover.** Every title is `#ff94b2`, and so is nav hover.
  - **Mobile menu.** Links are `#e1bcc2`, the current page is `#ff94b2`, and the indices are `#715e61`.

**Defects that cost points.** These are legacy hues and off-family controls that are still present. Each was flagged in an earlier round:
- **Save dialog "Back to the artwork" is still mauve `#c0aab7`** (`save.json`, `shots/save-dialog.png`; source `media-download.css:115`).
  - The brief names the Save dialog explicitly.
  - This is the round-1 F8 and round-2 nit, still open after three rounds.
  - The × in the same dialog is `#e1bcc2`, so the dialog itself is inconsistent.
- **Violet/coral fringe on every page-title arrival.**
  - Frozen at 300ms on `/contact-waambat`, the h1 `text-shadow` is `rgba(148,87,255,.67) -0.9px, rgba(255,112,112,.67) 0.9px`: 1,230 violet and 269 coral pixels in a 300px crop (`shots/title-arrive-300ms.png`, `arrive.mjs`).
  - It also appears in the caption `title-resolve`, and in `Hero.module.css` 134–147.
  - The owner asked for page titles in the wordmark pink and datamosh effects in the two pinks. Every title still arrives in the old purple/coral vocabulary (round-2 m4, unaddressed).
- **Fallback links outside the family.** "Open original video ↗" on /mechanics and the archive's "Video unavailable · Open original source ↗" are white or grey, not pastel links (`shots/mech2-no-preference-300.png`, `shots/archive-no-preference-900.png`).

## 3. Interaction quality: 9/10

- **Hover bursts fire once and stop** (`bursts.mjs`, `bursts.json`). With the pointer parked for 2.5s at 15%, 50% and 85% of the target's height:
  - desktop nav, current nav, caption title, inline link, media control, mobile-menu link (390, fine pointer) and mobile-menu link at 200% zoom each fired **exactly 1** burst, with **0** running animations after 2.5s;
  - the wordmark fired 0–1;
  - reduced motion fired 0.
  - This is down from 15–21 per 2s in round 2.
  - The bursts look deliberate and resolve cleanly (`shots/sheet-bursts.png`: 60ms frame left, 2500ms rest right). The owner's "stop after a moment" is met.
- **Quick presses and taps land.** 60, 100 and 130ms holds at 30%, 50% and 75% of the link's height:

  | Input | Landed |
  |---|---|
  | Touch, mobile-menu "bio", 390 | 9/9 |
  | Mouse, desktop nav "bio", 1440 | 9/9 |
  | Touch, 768 nav | 9/9 |
  | Reduced motion, touch | 2/2 |

  Keyboard works too: Enter on Menu focuses "Close menu", and Enter on "bio" arrives with focus on `main-content`. Round-2 B2 is fixed.
- **The menu closes in every motion mode** (`menu.mjs`, `menu.json`). × / Escape / link, closed in:
  - full: 423 / 313 / 413ms;
  - calm: 305 / 211 / 315ms;
  - off: 78 / 60 / 133ms;
  - reduced: 79 / 56 / 83ms.

  Each of the 12 runs ended usable: no `inert`, `aria-expanded=false`, the Menu button visible, scroll unlocked, and focus returned to Menu or moved to `main-content`. Round-2 B3 (calm lockout) is fixed.
- **Menu animation.** The slice scan-in and pink tear, the staggered link resolve and the wipe-out read as deliberate (`shots/sheet-menu-open-close.png`, frames 60–900ms open and 50–600ms close).
- **Hamburger centring.** Wordmark ink centre vs button centre (`menu.json` plus my re-scan of `shots/centre-*.png`):

  | Page and width | Button | Wordmark | Delta |
  |---|---|---|---|
  | home 360 | 34.0 | 34.5 | −0.5px |
  | home 390 | 36.8 | 36.0 | +0.8px |
  | home 700 | 66.1 | 65.5 | +0.6px |
  | bio, contact, mechanics | 51.1 | 50.5 | +0.6px |

  The × sits on the same 44×44 spot (326, 29.1 on bio at 390).
- **Cursor readable.** The dark keyline is now painted (`cursor.json`). Near-black pixels around the glyph number 4,100–6,000 over a pink title, black, nav and the hovered submit, against 0 in round 2. The I-beam over a `#ff94b2` title separates by its keyline (`shots/cursor-over-pink-title.png`). The press sets `data-pressed`.
- **Video autoplay and pause** (`video.mjs`, `video.json`, 148 scroll steps):

  | Sweep | Videos | Steps |
  |---|---|---|
  | home 1440 | 22 | 60 |
  | home 390 | 6 | 33 |
  | home 390 after arriving via the mobile menu | 24 | 33 |
  | archive 1440 | 8 | 14 |
  | mechanics 768 | 1 | 8 |

  That gave **0** videos paused while ≥60% visible and **0** playing fully off-screen. The top video resumes on return. On /mechanics, G1 plays in view and pauses at 48% visible.
- **Points off:**
  - Reduced-motion visitors get a play button on dead videos that does nothing.
  - "Back to the artwork" in the Save dialog has no accent hover.
  - Closing through a link takes about 410ms at full motion, slower than round 1 (about 210ms).

## 4. Accessibility and responsiveness: 8/10

- **axe-core 4.14.0** (`a11y.json`), 8 pages × 390 and 1440, reduced motion. The only violations are the pre-existing `region` ×1 (the canvas rail) and `page-has-heading-one` on `/art-by-waambat`. Nothing new.
- **Overflow and zoom.**
  - At 200% (720×450 CSS, DPR 2) overflow is 0 on all 8 pages, and the menu button is used.
  - With the menu panel scrolled to the bottom, the × stays at y 29.1, in view (`shots/zoom200-menu-scrolled.png`). Round-2 m1 is fixed.
  - Overflow is also 0 at 360, 390, 768 and 1440.
- **Reduced motion.** Census on `/contact-waambat`: 0 running animations idle, 0 on hover, 0 on press. The menu closes in 56–83ms. 0 hover bursts.
- **Focus.**
  - Tab rings are `#e1bcc2` (12.2:1 on black) or `#ff94b2` on every focusable element, except the third-party iframes.
  - Form fields show their ring on the wrapper.
  - The menu traps focus and returns it.
- **Forced colors** (`shots/forced-field-focus.png`, `forced-menu-open.png`). Field focus shows a 2px Highlight outline, and the menu is legible in system colours.
  - **Defect:** in forced colors the current page in the mobile menu ("bio") loses its distinguishing underline and colour. It looks identical to the other links, because the indicator is a `background: currentColor` pseudo-element and a colour. It is still exposed through `aria-current`. This is minor.
- **Smaller points:**
  - Menu index numerals are 3.48:1. They're decorative and `aria-hidden`.
  - Reduced-motion users get no "video could not load" message for dead sources (see §1).
  - Client-side `aria-invalid` is unverified by me (round 2 measured it as stuck at `"false"`, which predates this pass).
  - Admin is unverified.

## Fixed since round 2 (verified, not taken on trust)

| Round-2 finding | Now |
|---|---|
| B1 hover strobe loop | **Fixed.** 1 start per hover, 0 running after 2.5s |
| B2 presses swallowed | **Fixed.** 27/27 quick presses and taps at 60/100/130ms, plus 2/2 reduced |
| B3 calm lockout | **Fixed.** 3/3 calm closes usable, 211–315ms |
| M1 cursor keyline not painted | **Fixed.** 4,100–6,000 keyline pixels |
| m1 × lost at 200% zoom | **Fixed.** × stays at y 29 |
| m4 violet/coral title arrival | **Open** |
| F8 mauve Save Cancel | **Open** (`#c0aab7`) |
| m2 pink on body-length headings | Owner-directed, still heavy |

## Summary

| Category | Score |
|---|---|
| Design fidelity | 7 |
| Palette consistency | 7 |
| Interaction quality | 9 |
| Accessibility and responsiveness | 8 |

**FAIL.** Two categories are below 8.

Top defects, ranked:
1. **/mechanics G1 video** renders as a 629×150 strip under reduced motion; the original is a 629×629 square. It is 350×150 against 350×350 on phones.
2. **The Save dialog's "Back to the artwork" is still mauve `#c0aab7`.** It is an interactive control the brief names, and it has been open since round 1.
3. **Every page title still arrives with a violet/coral (`#9457ff`/`#ff7070`) fringe,** in a pass where titles and datamosh effects are meant to be in the two pinks.
4. **Under reduced motion, dead videos show a non-working play button** instead of the "could not load" fallback.
5. **Minor:**
   - In forced colors, the current page in the mobile menu isn't distinguished.
   - The fallback "Open original" links are white or grey rather than accent.
   - Body-length heading text is now saturated pink (owner-directed, but it noticeably changes the weight of the blog, bio and mechanics pages).
