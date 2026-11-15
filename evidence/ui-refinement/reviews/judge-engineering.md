# Engineering judge: WAAMBAT pastel UI pass

I'm the independent engineering judge. I didn't implement this pass and I didn't edit any source file. All my scripts and raw output are in `evidence/ui-refinement/reviews/judge-engineering/`. Each script runs with `node <script>.mjs` from that folder. The theme probe runs with `node --test --experimental-strip-types theme-probe.test.ts`.

- **Branch:** `polish/pastel-accent-ui`, uncommitted, base `412b456`.
- **Preview:** the dev server on :3287, driven headless with playwright-core 1.64.1. I didn't restart it.
- **Safety:** all non-GET requests were aborted. `/media-originals/*` was aborted everywhere except `direct-tile.mjs`, which needed one tile's own playback GET. No admin login. No stored setting was changed. The `calm` and `off` motion modes were set on my own page's DOM only.
- **Line references** are to the working tree at `205c325b8c53` unless marked otherwise.

## The revision moved during the review

The fingerprint is `git diff -- kerf/src kerf/test ':!kerf/src/content/media-downloads.json' | shasum`.

| Time | Fingerprint | What changed |
|---|---|---|
| 18:56 | `cbf341f8bc30` | Start. Saved as `diff-snapshot-start.patch`. First run of all four commands. |
| 19:02 | `47bc2ab810e1` | `InlineVideo.tsx` now uses `useAdaptiveVideo` and drops `src` from its `<video>`. `adaptive-media.ts` and a new `local-streams.json`. |
| 19:08 | `205c325b8c53` | `OrdinalPiece.tsx` gains VideoStill and adaptive video. `VideoEmbed.tsx` gains `DirectPlayer` and VideoStill. New `inscription-body` tests. |

These are playback-selection edits. I can't tell from the tree whether they belong to the media task or to this pass. My code review covers the start snapshot, plus a reread of the files that changed afterwards. The second command run and the later browser runs (`video.mjs` at 19:04, `direct-tile.mjs`, `bursts.mjs`) ran on `205c325b8c53`. **A final verdict needs a frozen revision; this one wasn't frozen.**

## Commands

`uptime` read a 1-minute load of 6.9 at the start and 7.9 for the re-run, so nothing was offloaded. Logs are `*.log` and `*-rerun.log`.

| Command | `cbf341f8bc30` (18:54) | `205c325b8c53` (19:12) |
|---|---|---|
| `npm run -s typecheck` | exit 0, `kerf tsc: 0 errors` (1 s) | exit 0, 0 errors |
| `npm run -s test` | exit 0, `tests 83, pass 83, fail 0` (7 s) | exit 0, `tests 86, pass 86, fail 0` |
| `npm run -s check` | exit 0, `44 files, 0 errors, 5 warnings` | same |
| `npm run -s build` | exit 0 (22 s) | exit 0 (28 s) |

- **Check warnings:** all five predate this pass. `git blame` puts the warned lines (`ThemeEditor.tsx:50/54/79`, `ContentPage.tsx:191`, `ContactForm.tsx:96`) at `412b456`.
- **Build audit:** the build printed `L000 … No built pages to audit` and `0 pages audited`. The build passes, but it contains no page audit.

## 1. Framework and engineering quality: 7/10

**Good**
- **Kerf idioms are used correctly.** `watch` callbacks return cleanups, and Kerf runs them before the next run and on dispose (`@kerf-js/core/src/index/state.ts:155-170`).
  - Header's close deadline: `Header.tsx:20` clears its `setTimeout` when the phase leaves `closing`.
  - The press-burst installer's cleanup is registered from `onMount` (`RouteEffects.tsx:8`, `mosh.ts:30-33`).
  - `CanvasScrollbar.tsx:106` removes every listener it adds.
- No React compatibility layer was added. `mobile-menu.ts:4` still says "React 19 callback-ref cleanup", but that line is from `412b456` and wasn't touched.
- **No leaks across navigation, measured.** `lifecycle.mjs` instruments every `document`/`window` listener. Across 12 client-side navigations of the desktop nav, the counts are identical by type before and after (`lifecycle.json` `leak`, for example `document:visibilitychange` 27 → 27, `window:scroll` 1 → 1). The rail does 0 rAF/s at idle.

**Defects**
- **Vimeo error fallback leaks a player per open (measured).**
  - `VideoEmbed.tsx:37` creates `new Player(element)`. Its cleanup (`:42-44`) only sets `cancelled = true`. It never calls `player.off('error')` or `player.destroy()`.
  - `@vimeo/player` adds a `window` `message` listener per player. In `vimeo.mjs`, opening the archive viewer on a Vimeo work 4 times took `window` `message` listeners **7 → 8 → 9 → 10 → 11**. The control, a non-Vimeo item opened 4 times, stayed at 11 → 11.
  - The sibling `InlineVideo.tsx` handles the same SDK correctly (`destroy?.()` in its cleanup).
- **Rail colours are snapshotted.** `CanvasScrollbar.tsx:15-16` reads the tokens once at mount into `colors`. A theme change after mount, such as the admin preview or a content reload, never reaches the canvas rail.
- **`themeStyle()` runs twice per root render.** `_layout.tsx:24` calls it once for a new `display:contents` wrapper and again for `SiteFrame`, which does the OKLCH derivation twice. The wrapper exists only so that RouteEffects, CanvasScrollbar and MediaDownload inherit the tokens. That is a second token scope, not one owner.
- **Minor:**
  - `InlineVideo.tsx:10` still imports `SourceImage`, which is no longer used.
  - `mosh.ts:20` timers aren't cleared on dispose (harmless).
  - `Header.tsx:20` packs a ten-statement lifecycle onto one line, which makes it hard to review.

## 2. Correctness and robustness: 8/10

**Verified in the browser**
- **Menu `closing` → `closed` (`lifecycle.json`).** Tested at 390 touch on `/mechanics`, under `full`, `calm`, `off` and reduced motion. All three close paths reach `closed`, and none leaves anything inert.

  | Mode | × | Escape | Link to `/bio-waambat` |
  |---|---|---|---|
  | full | 370 ms | 306 ms | 356 ms |
  | calm | 223 ms | 224 ms | 270 ms |
  | off | 55 ms | 29 ms | 82 ms |
  | reduced | 0 ms | 0 ms | 30 ms |

  - The round-2 calm lock-out (B3) is fixed by the separate `menu-fade-out` keyframes (`Header.module.css:444-455`).
  - **Race:** reopening 50 ms into `closing` ends `open`, and the next Escape still closes (335 ms in full mode). The 600 ms deadline was armed 5 times and never fired late.
- **Still gate and playback (`video.mjs`, `direct-tile.mjs`).**

  | Page | Videos | Visible-video checks | Stuck while ≥60% visible | Playing off screen |
  |---|---|---|---|---|
  | home 1440 | 24 | 35 | 0 | 0 |
  | home 390 | 24 | 39 | 0 | 0 |
  | archive 1440 | 23 inline tiles | 35 | 0 | 0 |
  | archive 390 | 23 inline tiles | 38 | 0 | 0 |

  - On the archive, all 23 stills loaded. There were 0 broken images and no `src=""` anywhere.
  - The 16 "unavailable" archive tiles are a headless-environment effect: Vimeo and YouTube answered 403 from a Cloudflare challenge. "Everything" (115879626) failed only because my guard blocked `/media-originals/`.
  - With that GET allowed, the direct tile on the current revision behaves correctly: it plays (`readyState` 4, `delivery: mp4`), pauses off screen, and resumes on return.
- **Bursts (`bursts.mjs`).** Each hover gives 1 `animationstart` (12 of 12 parks, 2 s each). Presses land 9 of 9 by mouse and 9 of 9 by touch (60/100/130 ms holds at 30/50/75% of the link height). Round-2 B1 and B2 are fixed.
- **Vimeo fallback.** All 4 viewer opens rendered "Video unavailable · Open original source ↗" instead of Vimeo's error page.

**Defects**
- **The rail's energy loop runs when the glitch is off.** `CanvasScrollbar.tsx:79` accumulates `energy`, and `:77` reschedules rAF while `energy > 0.02`. Neither checks `glitchAllowed()`. Under reduced motion, one 10-wheel scroll burst plus 1.2 s produced 51 rAF calls that only redraw the plain thumb (`lifecycle.json` `railReduced`). It is bounded, at about 22 extra frames per burst, but it is wasted work in exactly the mode that asks for less.
- **VideoEmbed's `unavailable` never resets.** `VideoEmbed.tsx:23` sets it once and nothing clears it. After "Close player", reopening shows the fallback without retrying. That is acceptable for permanently refused works, but wrong after a transient network error.
- **A possible early ready in VideoStill.** `VideoStill.tsx:15` decides readiness with `image?.complete`. If `source` changed on a live instance and the watch ran before the new `src` was applied, it would report ready against the old image. No current caller changes `source` (InlineVideo destructures `src`), so this is latent only.

## 3. Token and theme architecture: 7/10

**Good**
- **One derivation.** `accentFamily()` (`theme.ts`) produces every shade from a base: OKLCH lightness steps at the base hue, plus sRGB mixes over the background.
- **CSS defaults match the TS output, and a test enforces it.** `fidelity-theme.test.ts:63-69` checks every `--ui-*` and `--color-waambat-*` literal in `globals.css` against `themeStyle(originalTheme)`.
- **The removed variables are gone.** No reference to `--site-action-text`, `--site-logo-text`, `--site-action-hover-text`, `--color-waambat-hover` or `--color-waambat-link-hover` remains in `src/`.
- **Every remaining `var(--…, fallback)` agrees with the TS defaults.** I checked each one with grep: `#ff94b2` for the logo, `#000` and `#ebebeb` for the site, `37px`, `1` and `20px` for sizes.

**Defects** (`theme-probe.txt`)
- **The legacy migration is unconditional, so some deliberate choices can't be represented.** `migrateLegacyAccent` (`theme.ts:111`) runs inside `z.preprocess` on every parse (`:161`), and `Editor.tsx:152` parses on save.
  - An admin who picks heading `#e1bcc2` (the former title colour) gets `#ff94b2`. Picking link `#9457ff` gives `#e1bcc2`, and navigation hover `#fa75d0` gives `#ff94b2`.
  - DECISIONS says "a deliberately customized value is kept". That holds for every value except these four, and those are the likeliest ones for someone restoring the old look to choose.
- **Hover isn't derived from a custom base.** `linkHover` and `navigationHover` are stored defaults computed from the canonical pastel (`theme.ts:127,131`), and `themeStyle` emits them unchanged (`:181-182`). `pressed`, `border`, `surface` and `disabled` do follow the stored `link`.
  - With `link: #00aa88`, the family comes out as base `#00aa88`, pressed `#09876c`, **hover `#f1d1d6`** (pastel pink). A derived hover would be `#4fba9c`.
  - The family is single-source only while the defaults are untouched.
- **Theme tokens don't reach `html`.** The tokens are emitted on `.site-theme` and on the `display:contents` wrapper, but `globals.css:37` (`accent-color`) and `scrollbar.css:3` (`scrollbar-color`) are declared on `html`. They resolve against the `:root` literals, so a saved theme never reaches native checkboxes and radios that inherit `accent-color`, or the native scrollbar fallback.
- **Fallback literals are duplicated and untested.** `CanvasScrollbar.tsx:16` repeats `#ff94b2`, `#ffb5c8`, `#e27092` and `#e1bcc2`. CSS-module fallbacks such as `Header.module.css:202` and `Hero.module.css:64,78` do the same. They are correct today, but the parity test only reads `globals.css`.
- **Some Save-dialog colours are off-token.** `media-download.css:10,61,65,115` hard-codes `#f3e8ee`, `#cbb8c3`, `#9b8793` and `#c0aab7` outside the family.

## 4. Verification and test coverage: 6/10

**Covered**
- Exact family values and contrast floors (`fidelity-theme.test.ts:33-61`).
- Readable on-accent text for arbitrary link colours (`:16-31`).
- CSS ↔ TS default parity (`:63`).
- Legacy defaults migrating, with other settings kept (`:70-89`).
- A sweep for legacy hues across `src/**/*.css|tsx` (`:91-109`).

All of these pass, and they are real assertions on computed output.

**Gaps**
- **The migration test claims more than it proves.** Its title says "chosen colours … stay", but it only checks non-legacy values (`:86-88`). A deliberately chosen legacy value isn't kept (section 3), and a test for it would fail.
- **No test of a custom base**, which would catch the hover drift above.
- **No automated coverage of the lifecycle fixes the pass depends on:** the closing deadline, the still-ready gate, the Vimeo fallback, the paint-only bursts and the rail loop. The app has no DOM test runner, and adding vitest would be a new dependency, so browser scripts are a fair substitute. But they need to be saved.
- **The round-3 measurements in DECISIONS have no saved scripts or output in `evidence/`.** That covers "25 home videos over 73 scroll steps", "9 of 9", the menu centres and the 1512-wide /mechanics geometry. The newest implementer artifacts are `round2/*.mjs` at 18:21. I re-measured the playback, menu and press claims myself, and they hold, but the implementer's own numbers are unsupported as delivered.
- **The build audited 0 pages** (`L000`).

## 5. Scope discipline: 7/10

**Good**
- No file under `src/server`, auth, or the save API changed.
- **Content edits are limited to `/mechanics`** (`content-scope.mjs` → `content-scope.txt`):
  - 16 → 16 blocks, the same block multiset ignoring `id` and `width`;
  - every `id` keeps its content;
  - the only additions are `width` 612, 560 and 960 on three images;
  - page meta is unchanged and no other page differs.
- `kerf/src/content/site.json` and `src/content/site.json` are byte-identical (`cmp`).
- No new runtime dependency comes from this pass's files.

**Concerns**
- **Media pipeline and playback selection.** DECISIONS §7 says this pass registered "Everything" in `media/source-manifest.json`, ran the media pipeline (`--videos --only`), and routed the work to a local `/media-originals/…mp4` in `playback-media.json`. The brief forbids changes to "media encoding, playback selection, source files". It was owner-requested in round 3, but it overlaps the media worker's ownership and is now entangled in a 6,060-line manifest diff.
- **The content schema changed.** `content.ts:216` adds `width` and `PageEditor.tsx:263` adds the field for it. It is backward compatible. But the input accepts decimals and out-of-range values, which the strict `int().min(40).max(1600)` then rejects for the whole save.
- **Unattributed Save-path change.** `MediaDownload.tsx` now uses `resolveMediaDownload` (new `lib/media-download.ts`) and has new error copy. It isn't on the media-task list I was given, and DECISIONS doesn't mention it. Saving was out of bounds for this pass, so the owner should confirm which task made it.
- **Playback edits landed during the review** (see the revision table) and weren't reviewed by any critic.

## Scores

| Category | Score |
|---|---|
| 1. Framework and engineering quality | **7/10** |
| 2. Correctness and robustness | **8/10** |
| 3. Token and theme architecture | **7/10** |
| 4. Verification and test coverage | **6/10** |
| 5. Scope discipline | **7/10** |

## Verdict: FAIL

Three of the five categories score below 8 (and verification at 6), so the pass doesn't meet the threshold. The round-2 blockers are verified fixed: the hover loop, the swallowed presses and the calm-mode lock. Commands pass, and listener hygiene is clean across navigation. What keeps it below 8 is token derivation that only works at the defaults, a measured Vimeo player leak, missing evidence for the round-3 claims, and a source tree that kept changing during judging.

## Defects, ranked

1. **Major: legacy migration overrides deliberate choices.** `src/lib/theme.ts:111` and `:161` (applied on save at `src/admin/Editor.tsx:152`). Admins can't save heading `#e1bcc2`, link `#9457ff`, link hover `#ff7070` or navigation hover `#fa75d0`. **Fix:** version the stored theme, for example `accentVersion: 2` defaulting to 2 for new data. Migrate only when the field is absent, then write the version on save. Add a test that a stored v2 theme keeps `#e1bcc2` as its heading.
2. **Major: the accent family isn't derived from a custom base.** `src/lib/theme.ts:127,131,181-182`. A custom `link` keeps the pastel hover. **Fix:** make `linkHover` and `navigationHover` optional (no static default). In `themeStyle`, emit `theme.linkHover ?? accent.hover`. Also treat a value equal to the old derived default as unset under the versioned migration above. Add a custom-base test that asserts hover equals `accentFamily(link).hover`.
3. **Major: Vimeo player leak in the error fallback.** `src/components/VideoEmbed.tsx:37,42-44`. Each archive-viewer open adds a `window` `message` listener and keeps a detached iframe (7 → 11 over 4 opens). **Fix:** keep `player` in the closure. In cleanup, call `player.off('error', fail)` and `void player.destroy().catch(() => {})`, as `InlineVideo.tsx` does. Also reset `unavailable` when `loadedSource` changes.
4. **Major (process): round-3 claims have no saved evidence, and the revision wasn't frozen.** `evidence/ui-refinement/DECISIONS.md` round 3. **Fix:** commit or freeze the revision. Save the measurement scripts and JSON under `evidence/`, then have the critics and judges rerun on that fingerprint.
5. **Minor: themed tokens don't reach `html`.** `src/styles/globals.css:37` and `src/styles/scrollbar.css:3`. **Fix:** move `accent-color` (and `color-scheme`) onto `.site-theme`, or emit the `themeStyle` vars on `:root`/`html` once from the layout. That would also remove the second `themeStyle()` call and the `display:contents` wrapper at `src/routes/_layout.tsx:24`.
6. **Minor: the rail's rAF loop spins with the glitch disabled.** `src/components/CanvasScrollbar.tsx:77,79`. **Fix:** in `scrolled`, add energy only when `glitchAllowed()`. Cache `glitchAllowed` from a `matchMedia` change listener and the `data-motion` attribute instead of a `querySelector` per frame.
7. **Minor: rail colours are snapshotted at mount.** `src/components/CanvasScrollbar.tsx:15-16`. **Fix:** re-read the tokens inside `draw` (the declaration is live and the reads are cheap), or re-read on theme change.
8. **Minor: the `width` input lets invalid values reach a strict schema.** `src/admin/PageEditor.tsx:263-268` against `src/lib/content.ts:216`. **Fix:** round and clamp to 40–1600 in `onChange`, or show the field error instead of failing the whole save.
9. **Minor: fallback literals are duplicated outside the parity test.** `src/components/CanvasScrollbar.tsx:16`, `Header.module.css:202`, `Hero.module.css:64,78`, `media-download.css:10,61,65,115`. **Fix:** import the defaults from `theme.ts` in TS. Extend `fidelity-theme.test.ts:63` to scan every `var(--ui-*|--color-waambat-*, fallback)` in `src/**/*.css`. Tokenise the Save-dialog greys.
10. **Nit: dead import.** `src/components/InlineVideo.tsx:10` (unused `SourceImage`). `src/lib/mosh.ts:20` timers aren't cleared on dispose.
11. **Scope: confirm ownership** of the `MediaDownload.tsx` / `lib/media-download.ts` Save-path change, the Vimeo-local pipeline run (`media/source-manifest.json`, `playback-media.json`), and the 19:02–19:08 playback edits (`InlineVideo.tsx`, `OrdinalPiece.tsx`, `VideoEmbed.tsx` `DirectPlayer`). Keep them out of this cosmetic pass's sign-off.

## Evidence index (`reviews/judge-engineering/`)

| File | What it covers |
|---|---|
| `commands.log`, `typecheck.log`, `test.log`, `check.log`, `build.log` | First run of the four commands (`cbf341f8bc30`) |
| `commands-rerun.log`, `*-rerun.log` | Re-run on `205c325b8c53` |
| `revision.txt`, `video-revision.txt`, `diff-snapshot-start.patch`, `diff-now.patch`, `diff-now2.patch` | The moving revision |
| `lifecycle.mjs` → `lifecycle.json` | Menu across modes, close paths and the reopen race; listener leak across navigation; rail rAF loop |
| `video.mjs` → `video-home-mechanics.json`, `video-archive.json` | Still gate and playback while scrolling; broken images |
| `direct-tile.mjs` → `direct-tile.json` | The local direct tile plays, pauses and resumes |
| `vimeo.mjs` → `vimeo.json` | Vimeo fallback and the player leak, with a control |
| `bursts.mjs` → `bursts.json` | Hover loop and press activation |
| `theme-probe.test.ts` → `theme-probe.txt` | Migration, custom-base and light-background probes |
| `content-scope.mjs` → `content-scope.txt` | /mechanics-only content diff |
