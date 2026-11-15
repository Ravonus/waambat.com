# WAAMBAT pastel UI pass: scope and token decision

Branch `polish/pastel-accent-ui`, from `migration/kerf` at 412b456. Local only.

## Scope

In scope: the colors of interactive UI (cursor, links, navigation hover, pending and underline states, buttons, focus rings,
fields, the custom select, checkboxes and radios, the route progress bar and skeletons, the canvas scrollbar and its native
fallback, the Save dialog, media and Ordinal controls, selection highlight, admin links and native admin controls).

Out of scope, and left as they are: page structure, copy, geometry, typography, artwork and its framing glow, video, the
wordmark (it stays logo pink `#ff94b2`), the Ordinal kicker label, the legacy splash pages (recreations of the artist's
older pages), the non-interactive arrival motion of the wordmark and page titles (its violet/coral fringe echoes the logo's
arrival and isn't interactive UI), media encoding, playback, Save, auth and backend contracts.

## Canonical accent

`#e1bcc2`, the existing heading pink. The rendered `h1`/`h2` color at http://localhost:3287/ was `rgb(225, 188, 194)`, which
matches it. In OKLCH it is L 0.829, C 0.043, h 7.1°: light and muted.

## How the family is derived

`accentFamily(base, background)` in `kerf/src/lib/theme.ts` does the derivation. It's the only place it happens. Shades
move along OKLCH lightness at the same hue, so hover and pressed stay in the same family instead of jumping hue. Surfaces
and borders are sRGB mixes of the base over the page background.

| Token (CSS) | Rule | Default |
|---|---|---|
| `--ui-accent` | base (theme `link`, defaults to the heading pink) | `#e1bcc2` |
| `--ui-accent-hover` | theme `linkHover`, defaults to base L +0.06, C ×0.85 | `#f1d1d6` |
| `--ui-accent-nav-hover` | theme `navigationHover`, same default as hover | `#f1d1d6` |
| `--ui-accent-pressed` | base L −0.10, C ×1.1 | `#c39ca2` |
| `--ui-accent-focus` | base | `#e1bcc2` |
| `--ui-accent-border` | 50% base over background | `#715e61` |
| `--ui-accent-surface` | 8% base over background | `#120f10` |
| `--ui-accent-surface-strong` | 14% base over background | `#201a1b` |
| `--ui-accent-disabled` | 40% base over background | `#5a4b4e` |
| `--ui-on-accent` | ink: L 0.20 at base hue; white when the base is dark | `#221014` |
| `--ui-danger` | semantic error, always paired with text | `#ff7070` |

The contract test checks the actual values. Contrast on black: base 12.2:1, hover 14.8:1, pressed 8.6:1, border ≥3:1.
Ink on the base is 10.6:1.

## Stored settings

The admin keeps the same nine color fields and the same strict schema. Only three defaults change:

- `link`: `#9457ff` → `#e1bcc2`
- `linkHover`: `#ff7070` → derived hover
- `navigationHover`: `#fa75d0` → derived hover

When a stored theme holds exactly an old default for one of those three fields, it is read as the new default. A
deliberately customized value is kept. No other stored setting is touched.

## Kerf and shared components

Veneer exists in the framework source (`packages/veneer`), but it isn't installed or pinned here. Adding it would be a new
dependency and would bring its kit appearance. The existing custom components keep their approved look and their Kerf
`state`/`derived`/`watch`/`onMount`/`onCleanup` lifetimes, and now read the shared tokens. Native controls get
`color-scheme: dark` and `accent-color` from the same tokens. The canvas scrollbar stays on `@kerf-js/scroll/canvas` and
reads its colors from the tokens.

## Round 2: owner direction (2026-11-14, during the pass)

The owner added these during the pass. Each item overrides the earlier brief where the two conflict.

1. The **cursor** uses the wordmark pink `#ff94b2`, not the pastel. Its sheen is the same OKLCH steps taken from the
   logo: light `#ffb5c8`, base `#ff94b2`, deep `#e27092` (`--ui-cursor*`, from `accentFamily(theme.logo)`). A dark
   keyline keeps it readable over pink titles and filled buttons; critics measured it at 1.0–1.7:1 without one.
2. **Titles** use the wordmark pink: theme `heading` defaults to `#ff94b2`. A stored heading of exactly the old
   default `#e1bcc2` reads as the new default. Labels, statuses and admin action buttons that borrowed the heading
   token move to the pastel accent, so only titles change.
3. The **side scroll rail** uses the wordmark pink family: a gradient thumb, lighter on hover, deeper with a
   chromatic split while dragged. The native fallback and the rail's focus ring match it.
4. **Navigation hover** uses the wordmark pink, so it can't be mistaken for the white current page (a critic finding).
   Pressed uses the deep step.
5. **Mobile menu redesign**, same model, destinations, single logo and button position:
   - The hamburger is three strokes that shear apart on hover and press in on tap.
   - Inside the open menu, the same strokes fold into an X at the exact same 44×44 spot (measured at
     326,36 for both).
   - The panel scans in from the top in horizontal slices with a one-shot tear of pink bands, and wipes out in
     slices on close.
   - Links are 28px pastel with mono index numbers. Each arrives with a short datamosh resolve, staggered 45ms. The
     current page is wordmark pink with its split underline.
   - Calm motion keeps a plain fade. Off and reduced motion are instant.
6. **Datamosh effect language** (`src/styles/effects.css`, `src/lib/mosh.ts`). Each burst is one shot under 300ms in
   the two pinks, never looping:
   - Text bursts (split shadows plus a few slice frames) on nav, link and title hover and on keyboard focus.
   - Box bursts (split drop-shadows) on press for buttons, options and checkboxes, by pointer or Enter/Space.
   - Fields tear on focus, then settle on their focus ring.
   - The cursor splits on press.
   - Only the "full" motion setting gets these effects. The global reduced-motion rule removes every animation.
   - The thin bands and offsets stay well under the WCAG 2.3.1 flash area.

Round-1 critic fixes folded in:
- The active select option is clearer (20% accent fill, a pink inset bar, pink text, and an outline in forced colors).
- Field focus is visible in forced colors.
- Server errors show in the danger color.
- The Save "Try again" button is styled.
- The archive viewer's buttons have hover and pressed states.
- The admin wordmark link keeps its pink on hover.
- A link inside a longer heading gets an underline.
- Small floated labels and required marks use the wordmark pink.

## Round 3: critic blockers, owner follow-ups (2026-11-14)

Owner asked for: the hover effect on menu text to stop after a moment instead of repeating; the menu button moved up;
videos that reliably autoplay and pause on scroll with no race; /mechanics to match waambat.com/mechanics; the Vimeo
works that won't play to be made local.

1. **Bursts are paint-only** (`src/styles/effects.css`). Text bursts are split `text-shadow` frames; box, cursor and
   wordmark bursts are `drop-shadow` frames. Nothing translates or clips the element's own box, so its hit area never
   changes under the pointer.
   - Before: the clip-path slices let the pointer fall off a link, so hover restarted the burst at 7.5–10 Hz.
   - Before: a press could miss its link (4–6 of 9 quick presses worked).
   - Measured now: one burst per hover; 9 of 9 quick mouse presses and 9 of 9 quick touch taps land.
2. **Cursor keyline** moved to the cursor container. The arrow's mask was clipping a filter placed on the span.
   The press split moved there too.
3. **Menu button** centres on the wordmark (`--menu-top` on `.site-header`):
   - Header-logo pages: 40px padding + 0.3 × logo size − 22px.
   - Portrait phones with the hero: 3.2vw + 6.25vw × wordmark scale − 22px.
   - Measured centres: button 51.1 vs wordmark ink 50.5; home 390 wide 36.8 vs 36; home 700 wide 66.1 vs 65.5.
   - The close × uses the same value.
4. **Menu close always finishes.** Following a link closed the dialog, so no `animationend` ever fired and the
   navigation state stayed "closing" for good. Viewport playback only runs when the menu is "closed", so every video
   stayed paused after a menu navigation.
   - The header now finishes at once when the panel is hidden, has no animation, or the tab is hidden.
   - Otherwise a 600ms deadline finishes it.
   - Calm motion closes with its own `menu-fade-out` keyframes, so it fires `animationend`.
   - The open animation fills `backwards`, so its final translate no longer makes the panel the containing block for
     the fixed ×. The × stays put when the panel scrolls at 200% zoom.
5. **Video races**:
   - `VideoStill` reports ready once its still has settled, either way. A load or error that finished before
     hydration attached its handlers used to strand the movie.
   - With no still at all it doesn't wait, and it never renders `<img src="">`, which used to fetch the page URL.
   - `InlineVideo` reads its `<video>` at call time instead of capturing a ref that may not be attached yet.
   - Measured: 25 home videos over 73 scroll steps, none stuck paused while ≥60% visible and none playing off screen.
     The same holds after navigating home through the mobile menu.
6. **/mechanics matches the original**:
   - Block order restored: Quantum video after the first paragraph; MECHANICS, WL, then the 8oZCxzC video; TBObuJ0
     before the closing paragraph.
   - New optional image-block `width` (CSS px, editable in the page editor) gives 612, 560 and 960px. Measured
     against waambat.com at 1512 wide: x 450/476/276 and sizes 612×558, 560×566, 960×3300, identical.
   - Phones clamp to the column with no overflow.
   - The two dead imgur sources (3hhNUKR and TBObuJ0 redirect to imgur.com, and are blank on the original too) now
     show "Video could not load" with a link, instead of a broken image.
   - Small headings, which the original uses for body copy, are back in the pastel `#e1bcc2`; titles stay wordmark
     pink.
7. **Vimeo made local where possible.** Checked all 13 failing works in the owner's own Chrome:
   - 12 are refused by Vimeo itself, even on WAAMBAT's own vimeo.com pages ("This video isn't available. The owner
     has been notified."; oEmbed 404). Nothing exists to download.
   - "Everything" (115879626) still plays on vimeo.com; only its embed is refused. Its 720p H.264 video track
     (8.5 MB, 49.3s) was saved through the browser.
   - It was registered in `media/source-manifest.json` and encoded by the media pipeline's own `--videos --only` run.
     The pipeline kept the original: the AV1 and H.264 re-encodes failed its quality bar.
   - The archive tile and the fullscreen viewer play it locally at 1280×720.
   - Its audio track wasn't saved: Chrome blocks a site's second automatic download until the owner allows it. The
     site plays archive works muted.
   - Catalog backups before the change: `vimeo-local/backup/`.

## Round 3b: judge findings (2026-11-14)

Both judges failed round 3:
- Engineering: framework 7, correctness 8, tokens 7, verification 6, scope 7.
- Visual: fidelity 7, palette 7, interaction 9, accessibility 8.

Fixed since:

- **Stored themes are versioned.** `accentVersion: 2` is stamped on parse. The legacy-default migration now only
  touches themes saved before that marker existed, so an admin can deliberately choose `#e1bcc2`, `#9457ff`,
  `#ff7070` or `#fa75d0` again and it survives saving. Tested.
- **Hover colours are derived when unset.** `linkHover` and `navigationHover` are optional:
  - Link hover follows the link colour, e.g. link `#00aa88` → hover `#4fba9c`.
  - Navigation hover follows the logo colour.
  - The theme editor shows the effective colour and has a "Use automatic" reset. Tested.
- **The theme lives on `:root`.** `_layout.tsx` computes `themeStyle()` once and, on the client, mirrors it onto
  `document.documentElement` (removed on change or cleanup).
  - `accent-color`, the native scrollbar and the global overlays now follow the saved theme.
  - The extra `display:contents` wrapper and its second `themeStyle()` call are gone.
- **The Vimeo fallback no longer leaks.** Cleanup removes its error handler. After the update it destroys the
  player once its iframe has left the page, which drops the SDK's window message listener. Measured over four
  archive-viewer opens of a Vimeo work: 7 → 10, 10, 10, 10. Before: one more listener per open.
- **Scroll rail.** Energy builds only while the glitch is allowed: one redraw per scroll burst under reduced
  motion, against 51 before. Colours are re-read on every draw.
- **Image width input** is rounded and clamped to 40–1600, so a stray value can't fail a save.
- **Fallback test.** A new test checks every hard-coded `var(--token, #hex)` and scrollbar `token()` fallback
  against the theme defaults.
- **Small cleanups.** `mosh.ts` clears its timers on dispose, and the unused `SourceImage` imports are gone.
- **G1 (8oZCxzC) on /mechanics** carries its true ratio of 1, so it is 629×629 even when reduced motion keeps it
  from loading.
- **Save dialog.** Its last mauve greys are now tokens: body text, tinted copy, pressed-accent info, and a
  pastel "Back to the artwork".
- **Arrival effects.** Page titles and the hero wordmark arrive with a split in the two pinks (deep wordmark pink
  and pale hover pink) instead of violet and coral. The test now forbids the old hues everywhere.
- **"Open original" links** in video error notices are pastel.
- **Forced colours.** The current page in the mobile menu is underlined.

Evidence for rounds 3 and 3b is in `round3/`, on diff fingerprint `fingerprint.txt`. `run-all.sh` re-runs every
check, and each `*.out.txt` holds its output. `test.log` holds 89 of 89 passing tests and `build.log` the build.

Scope notes for the owner:
- The Save-path rewrite in `MediaDownload.tsx` / `lib/media-download.ts` and the playback edits made between
  19:02 and 19:08 (`InlineVideo`, `VideoEmbed` `DirectPlayer`, `OrdinalPiece`, `adaptive-media`) come from the
  concurrent media task, not this pass. This pass added only the Save "Try again" class and the Vimeo fallback in
  `VideoEmbed`.
- Running the media pipeline for "Everything" and adding it to the manifest was at the owner's request ("you
  download them").

## Round 3c: engineering judge r2 follow-ups

The engineering judge passed round 3b with 8 in every category. Its remaining defects:

- **Image width field (admin):** keeps what's typed while typing and clamps to 40–1600 on blur. Clamping on every
  keystroke would have turned "560" into 40.
- **`accentVersion`:** accepts any whole number from 2 up. Anything else (`null`, 1, "2") reads as 2 instead of
  failing the content store. Tested.
- **Vimeo fallback:** the "unavailable" flag resets whenever the loaded source changes, so replaying retries the
  player.
- **Scroll rail:** finds the theme root once and caches it, instead of querying the page on every frame.
- **Still open:** a non-default theme reaches `<html>` only after hydration. The page content itself is
  server-rendered with its theme on `.site-theme`, so only the native scrollbar and `accent-color` show the
  defaults until then. The default theme is unaffected.

Typecheck 0 errors, tests 90 of 90 (`round3/test.log`), `kerf check` 0 errors.

## Final verdicts

| Judge | Revision | Scores | Verdict |
|---|---|---|---|
| Engineering (`reviews/judge-engineering-r2.md`) | `644c5eb17a1a` (round 3b) | framework 8, correctness 8, tokens 8, verification 8, scope 8 | PASS |
| Visual (`reviews/judge-visual-r2.md`) | `385383d8d3d0` (round 3c) | fidelity 8, palette 9, interaction 9, a11y/responsive 8 | PASS |

The visual judge saw five files rewritten at 19:36:12; those were the round-3c fixes above, and it re-ran every check
they could affect. After both verdicts, one CSS-only change: with forced colors on, the current page in the desktop nav
is underlined, as in the mobile menu (`round3/forced-colors-nav.mjs`). Final fingerprint `9bce33669d45`
(`round3/fingerprint-final.txt`): typecheck 0 errors, tests 90 of 90, `kerf check` 0 errors with 5 pre-existing
warnings, build exit 0.

Known and left open:
- **Outside this pass:**
  - The /mechanics body font differs from waambat.com.
  - Under reduced motion, the "Hans Zimmer (2017)" first-frame still is solid black (the media task's choice).
- **Unverified:** the admin screens and the contact form's error markup (no login, no submit).
- **Custom themes before hydration:** a non-default theme reaches `<html>` only after hydration.
- **Not committed:** nothing in this pass is committed.
