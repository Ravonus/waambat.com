# Independent visual judge, round 3b re-judge: WAAMBAT UI refinement pass

I'm an independent judge. I didn't implement this pass and I didn't edit any source file. I treated every Round 3b line
in DECISIONS.md as a claim and measured it in the browser. I didn't rely on the implementer's `round3/` outputs.

## Setup and revision

- **Preview:** http://localhost:3287, left running. Headless Chromium through playwright-core 1.64.1 and axe-core 4.14.0, 2026-11-14 19:26–19:49 MST. Load average was 6–20, and I ran one browser at a time.
- **Fingerprint.** It is `git diff -- kerf/src kerf/test src | shasum | cut -c1-12`, run from `waambat/`.
  - At the start (19:26:40) it was `ad0864a6bcf2`, which matches `round3/fingerprint.txt`.
  - At the end (19:42:31 and again at 19:48:53) it was **`385383d8d3d0`**.
  - **It moved.** At 19:36:12, five files were rewritten in the same second:
    - `kerf/src/lib/theme.ts`
    - `kerf/src/components/CanvasScrollbar.tsx`
    - `kerf/src/components/VideoEmbed.tsx`
    - `kerf/src/admin/PageEditor.tsx`
    - `kerf/test/fidelity-theme.test.ts`

    `round3/test.log` has the same 19:36 timestamp. I have no snapshot of `ad0864a6bcf2`, so I can't say what the edit changed. These are this pass's files, not only media files.
  - The rewrite reloaded the page under my first accessibility run.
- **Re-runs on the final revision.** Because theme files changed, I re-ran these on `385383d8d3d0`:
  - the targeted fix checks (`r2.mjs` → `r2b.out`);
  - the palette audit (`palette-r2.json`);
  - axe, zoom, forced colors, reduced motion and CLS (`a11y-r2.json`);
  - the press re-check (`tapcheck.json`).

  The results matched the earlier runs on `ad0864a6bcf2`. The full-page captures (`pages-r2.json`, `shots-r2/now/`) ran from 19:40, also after the change.

  These ran before 19:36, on `ad0864a6bcf2`, and touch none of the changed files: burst and tap (`bursts-r2.json`) and menu (`menu-r2.json`). The video sweep (`video-r2.json`) ran 19:36:13–19:40, just after the edit, with no reloads.
- **Scripts:** `evidence/ui-refinement/reviews/judge-visual/`: `r2.mjs`, `run-r2.sh`, `tapcheck.mjs`, plus the reused `bursts`, `menu`, `a11y`, `video`, `pages`, `palette` and `sheet` scripts. Raw output is in `run-r2.out`, `r2.out`, `r2b.out` and `a11y-r2.out`.
- **Screenshots:** `judge-visual/shots-r2/`. Fresh captures are in `now/`; baseline vs now sheets are in `cmp/`. The `r2-*.png` files come from the claim checks.
  - Housekeeping: my palette re-run overwrote the round-1 `palette.json` before I renamed the output to `palette-r2.json`. The round-1 figures are still quoted in `judge-visual.md`.
- **Safety:**
  - Non-GET requests and `/media-originals/*` were aborted by a route guard.
  - The form was never submitted, and no message was sent.
  - **Admin is unverified.** I didn't log in.
  - Calm motion was set on my own page's DOM; no stored setting was changed.
- **Coverage:** 390, 768 and 1440 wide (plus 360, 700, 1512, and 200% zoom), with motion full, calm and reduced.

## Round 3b claims, verified

| Claim | Result | Evidence |
|---|---|---|
| G1 (8oZCxzC) on /mechanics is square, even under reduced motion | **Verified.** 350×350 at 390, and 629×629 at 768 and 1440, under full, calm and reduced (9 of 9). It fills the column each time; round 3 was 629×150 under reduced motion. | `r2b.out` MECH; `shots-r2/r2-sheet-g1-390.png` |
| Save dialog has no mauve; "Back to the artwork" is pastel | **Verified.** Back and × are `#e1bcc2` text and border. Back hovers to `#f1d1d6` and closes the dialog. The tinted copy is a token mix (`color(srgb .898 .811 .825)`), the title is `#ff94b2`, and there is no backdrop blur. | `r2b.out` SAVE; `shots-r2/r2-save-full.png` |
| Titles and hero wordmark arrive in the two pinks; no violet or coral | **Verified.** The h1 `title-arrive` shadow at 0, 110, 220 and 330ms is `oklab(.687 .145 .007)` = **`#e27092`** and `oklab(.889 .036 .005)` = **`#f1d1d6`**. The hero `hero-wordmark-in` uses the same pair. `grep` finds no `#9457ff` or `#c0aab7` in `kerf/src/styles` or `components`; `#ff7070` remains only as the semantic `--ui-danger` token. | `r2b.out` ARRIVE; `shots-r2/r2-title-arrive-110.png` |
| "Open original" links in error notices are pastel | **Verified.** The archive's "Open original source ↗" is `#e1bcc2` (4 of 4). The /mechanics "Open original video ↗" is `#e1bcc2` at every width and motion. | `r2b.out` OPEN, DEAD |
| Forced colors underline the current page in the mobile menu | **Verified.** "bio" gets `text-decoration: underline` and the 07 index is underlined; the others have none. | `shots-r2/r2-forced-menu.png` |
| Theme vars are on `:root` | **Verified.** `html` has 42 inline custom properties. `accent-color` is `#e1bcc2`, `scrollbar-color` is `#ff94b2 #120f10`, and there is one `.site-theme` wrapper. | `r2b.out` ROOT |
| Hover colours are derived when unset | **Partly verified.** The live defaults resolve to the expected values (`--ui-accent-hover` `#f1d1d6`, nav hover `#ff94b2`). I didn't change a stored theme, so the derivation from a custom link colour is **unverified by me** (the implementer has a test). | `r2b.out` ROOT |
| Dead videos under reduced motion show "could not load" and Retry after pressing play | **Verified.** Before the press, the slot is a blank box with "Play quantum mechanics", like the original's blank slot. After pressing, it shows "Video could not load. / Open original video ↗" and "Retry playback of quantum mechanics", at 390, 768 and 1440. Full and calm reach the same state on their own. | `r2b.out` DEAD; `shots-r2/r2-sheet-dead-390.png` |

## Scores

### 1. Design fidelity: 8/10

**What holds:**
- **Pages unchanged.** The baseline vs now sheets for 8 pages × 360/390/768/1440, top and scrolled, show unchanged geometry, typography, copy, nav and artwork framing (for example `shots-r2/cmp/desktop-mechanics-top.png`). Overflow is 0 on all 32 combinations, there are 0 broken images, and there are 0 console errors (`pages-r2.json`).
- **/mechanics vs waambat.com/mechanics.**
  - Block order and the MECHANICS, WL and Quantum Collection images match the original exactly (from round 3: x 450/476/276 and 612×558, 560×566, 960×3300).
  - G1 is now square everywhere.
  - Dead slots are blank, as on the original, until pressed.
- **Heading weight vs the owner's direction and the original:**

  | Page | Pink `#ff94b2`, 26px (titles) | Pastel `#e1bcc2`, 14px (body-copy headings) |
  |---|---|---|
  | /mechanics | both "Utility Mechanics…" titles | all 8 |
  | /contact | "How to collect", "Her name is WAAMBAT…", "Get in touch" | twitter, IG and discord |
  | /bio | "WAAMBAT", "Below are WAAMBAT's unedited responses…" | "[too edgy for algos]" and the interview questions |

  The original site styles those small headings `#e1bcc2` (round 3, `mechanics.json`), so they now match it. The page reads as on the original, with only true titles in the wordmark pink. That fits the owner's direction, and it fixes the "wall of pink" from round 2.

**What still costs points:**
- **Fonts differ from waambat.com on /mechanics.** The original's headings are a lighter geometric sans, and two blocks wrap one line longer locally. This predates the pass (the baseline uses the same local font).
- **Blog subtitles stay pink.** The 26px article subtitles on /blog-press (for example "Gretchen Andrew and WAAMBAT tell Cody Edison…", five lines at 390) are title-sized, so pink follows the direction, but they're the heaviest pink block left.
- **Media worker, outside this pass:** under reduced motion, the "Hans Zimmer (2017)" archive tile's first-frame still is solid black (`shots-r2/now/desktop-art-by-waambat-scrolled.png`). It plays correctly at full motion.

### 2. Palette consistency: 9/10

- **Interactive colours.** I recorded the default colour, the hover colour and the Tab focus ring for every link and button in view on all 8 pages at 1440, on the final revision (`palette-r2.json`):
  - **Accent hues:** `#e1bcc2` (337 uses), `#ff94b2` (47) and `#f1d1d6` (21).
  - **Neutrals:** `#9c9c9c`, `#ffffff` and `#ebebeb`.
  - **Legacy hues:** none.
- **Form.** Field focus ring, filled submit (`#221014` ink), select active option (20% fill and a `#ff94b2` bar), and `accent-color` are all in the family.
- **Owner pinks.** Cursor, titles, nav hover, the current-page marker and the rail all use the wordmark-pink family. The native scrollbar on `:root` is `#ff94b2` / `#120f10`. The arrival effects are now the same two pinks as the hover and press bursts, so there is one effect vocabulary.
- **Not a full 10:**
  - The "Video could not load." notice text is plain white beside its pastel link. That's acceptable, but the notice has no accent.
  - I couldn't check the admin palette.

### 3. Interaction quality: 9/10

- **Hover bursts.** One burst per hover and 0 animations still running after 2.5s on desktop nav, current nav, wordmark, caption title, media control, the mobile-menu link at 390, and the mobile-menu link at 200% zoom. Reduced motion fired 0. The inline link fired 1 at 15% and 85% of its height and 0 at 50% (`bursts-r2.json`). It never loops.
- **Presses and taps:**

  | Input | Landed |
  |---|---|
  | Touch, mobile menu, 390 | 9/9 |
  | Touch, 768 nav | 9/9 |
  | Reduced motion, touch | 2/2 |
  | Mouse, 1440 nav, in the suite | **8/9** |
  | Mouse, the failing case repeated (100ms at 75%) plus 60, 100 and 130ms variants, on the final revision | **17/17** |

  The single mouse miss (100ms at 75% height) did not reproduce in `tapcheck.json`, so I treat it as a one-off under load, not a regression. Keyboard Enter through the menu arrives with focus on `main-content`.
- **Menu close times** (`menu-r2.json`), with every one of the 12 runs ending usable: no `inert`, `aria-expanded=false`, the Menu button visible, scroll unlocked, and focus restored.

  | Motion | × | Escape | Link |
  |---|---|---|---|
  | Full | 359ms | 368ms | 478ms |
  | Calm | 312ms | 210ms | 378ms |
  | Off | 96ms | 59ms | 160ms |
  | Reduced | 97ms | 55ms | 97ms |

  The hamburger and × centre on the wordmark at 51.1 against an ink centre of 50.5.
- **Videos** (`video-r2.json`): home at 1440 (60 steps), home at 390, home at 390 after arriving via the menu, the archive and /mechanics at 768. That is 149 steps, with **0** videos paused while ≥60% visible, **0** playing off screen, and 0 reloads.
- **Dead videos** now give feedback and Retry in every motion mode. The Save dialog's Back control is styled and works.
- **Not a full 10:**
  - A link close takes about 480ms at full motion.
  - The one unreproduced mouse miss.

### 4. Accessibility and responsiveness: 8/10

- **axe.** 8 pages × 390 and 1440 show only the pre-existing `region` ×1 (the canvas rail) and `page-has-heading-one` on `/art-by-waambat` (`a11y-r2.json`).
- **Zoom.** At 200% overflow is 0 on all 8 pages, and the menu's × stays in view at y 29.1 with the panel scrolled.
- **Reduced motion.** 0 running animations idle, on hover and on press. The menu closes in 55–97ms. Dead videos are now announced as "could not load" with Retry once pressed. CLS while scrolling is ≤0.0004.
- **Forced colors.** Field focus shows a 2px Highlight outline, and the mobile menu's current page is now underlined.
- **What still costs points:**
  - **Desktop nav in forced colors:** the current page ("bio") isn't distinguished from the other links (`shots-r2/r2-forced-desktop-nav.png`). The fix covered only the mobile menu.
  - **Client-side `aria-invalid`:** unverified by me, because I won't press submit. Round 2 measured it stuck at `"false"`, which predates this pass.
  - **Menu index numerals** are 3.48:1. They're decorative and `aria-hidden`.
  - **Admin** is unverified.

## Round 3 defects: status

| # | Round-3 defect | Now |
|---|---|---|
| 1 | G1 629×150 under reduced motion | **Fixed.** 9 of 9 square |
| 2 | Save "Back to the artwork" mauve `#c0aab7` | **Fixed.** `#e1bcc2`, hover `#f1d1d6` |
| 3 | Violet/coral title arrival | **Fixed.** `#e27092` / `#f1d1d6`; no old hues in styles or components |
| 4 | Dead video under reduced motion: non-working play button | **Fixed.** The press shows "could not load", a pastel link and Retry |
| 5a | Forced colors: mobile menu current page | **Fixed** (the desktop nav is still open, see below) |
| 5b | Fallback "Open original" links grey or white | **Fixed.** `#e1bcc2` |
| 5c | Body-length headings in pink | **Fixed** where the original uses them as body copy (pastel 14px); the remaining pink is title-sized, per the owner |

## Summary

| Category | Score |
|---|---|
| Design fidelity | 8 |
| Palette consistency | 9 |
| Interaction quality | 9 |
| Accessibility and responsiveness | 8 |

**PASS.** Every category is at least 8.

**The revision moved during the run, from `ad0864a6bcf2` to `385383d8d3d0`,** when five files were rewritten at 19:36:12: `theme.ts`, `CanvasScrollbar.tsx`, `VideoEmbed.tsx`, `PageEditor.tsx` and `fidelity-theme.test.ts`. I re-ran everything those files could affect on `385383d8d3d0`, and it held. The verdict is therefore tied to `385383d8d3d0`. Any later edit needs a fresh check.

Remaining defects, ranked:
1. **Desktop nav in forced colors:** the current page isn't distinguished.
2. **/mechanics fonts** differ from waambat.com. This predates the pass.
3. **Reduced motion, "Hans Zimmer (2017)" archive tile:** the still is solid black. This is the media worker's first-frame choice, outside this pass.
4. **One desktop mouse press (100ms) missed once in 9.** It didn't reproduce in 17 repeats; watch it.
5. **Unverified by me:** admin, client-side `aria-invalid`, and hover derivation from a custom link colour.
6. **Nits:**
   - Link-close takes about 480ms at full motion.
   - The 26px blog subtitles are the heaviest pink left (owner-directed).
   - The menu index numerals are 3.48:1 (decorative).
