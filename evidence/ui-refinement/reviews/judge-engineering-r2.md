# Engineering judge, round 3b: WAAMBAT pastel UI pass

I'm the same independent engineering judge as in round 1 (`judge-engineering.md`). I didn't edit any source file and didn't restart the dev server on :3287. My scripts and raw output are in `evidence/ui-refinement/reviews/judge-engineering-r2/`. The round-1 probe scripts were copied there and re-run unchanged, except for one robustness fix in `bursts.mjs` (noted below).

The same safety rules applied as in round 1: non-GET requests were aborted, `/media-originals/*` was aborted except for the playback GET in `direct-tile.mjs`, I didn't log in to admin, and no stored setting was changed.

## Revision

The fingerprint is `git diff -- kerf/src kerf/test src | shasum | cut -c1-12`, logged in `revision.txt`.

| When | Fingerprint |
|---|---|
| Start, 19:26 | `ad0864a6bcf2`, which matches the coordinator and `round3/fingerprint.txt` |
| 19:29 | **moved** to `644c5eb17a1a` |
| End, 19:34 | `644c5eb17a1a` |

**Files that changed between 19:26 and 19:29:** `kerf/test/inscription-body.test.ts`, `kerf/src/content/first-frames.json`, `playback-media.json`, `local-streams.json`, `playback-assets.json`, `media-downloads.json` and `local-media.json`. These are all media-task catalogs and tests. **No file under review changed.**

I re-ran every browser probe after the move, so they reflect `644c5eb17a1a`. The four commands ran on `ad0864a6bcf2`. The fingerprint was still `ad0864a6bcf2` when the build finished (`commands.log`), so they ran on one consistent revision.

## Commands

`uptime` showed a 1-minute load of 17.3, below the threshold of 40, so everything ran on this Mac. Logs are in `commands.log` and `*.log`.

| Command | Result |
|---|---|
| `npm run -s typecheck` | exit 0, `kerf tsc: 0 errors` |
| `npm run -s test` | exit 0, `tests 89, pass 89, fail 0` |
| `npm run -s check` | exit 0, `44 files, 0 errors, 5 warnings`. These are the same five warnings that predate this pass: ThemeEditor W017 ×3, ContentPage D035 and ContactForm W017. |
| `npm run -s build` | exit 0, 43 s. It still reports `L000 … 0 pages audited`, so the build performs no page audit. |

## Round-1 defects re-checked

| # | Round-1 defect | Status | Evidence |
|---|---|---|---|
| 1 | The legacy migration overrode deliberate choices | **Fixed** | `theme.ts:121-123`: the migration is skipped once `accentVersion` is present, and every parse stamps `accentVersion: 2` (`:171`). My probe: a draft that edits heading `#e1bcc2` keeps it, and link `#9457ff` keeps it. An unversioned legacy theme still migrates and gets stamped. The test is `fidelity-theme.test.ts`, "a version-2 theme is never migrated…". See `theme-probe.txt`. |
| 2 | Hover colours weren't derived from a custom base | **Fixed** | `linkHover` and `navigationHover` are optional (`derivedColor()`), and `themeColors()` derives them. Link `#00aa88` gives hover `#4fba9c`, which equals `accentFamily("#00aa88").hover`. Logo `#33ccff` gives navigation hover `#33ccff`. The default theme is unchanged (`#f1d1d6` / `#ff94b2`). ThemeEditor shows the effective value plus a "Use automatic" reset. |
| 3 | The Vimeo fallback leaked a player per open | **Fixed** | `VideoEmbed.tsx:45-55`: `off('error')`, then a deferred `destroy()` once the iframe is detached. `vimeo.mjs` measured window `message` listeners at 7, then 8 during each of 4 opens, then **7 after closing**. Round 1 grew to 11. The control stayed at 7 → 7. The implementer's `leak-and-root.out.txt` reads 7 → 10, 10, 10, 10 with its own instrumentation. The numbers differ, but neither grows. The "also reset `unavailable`" part was **not done** (see remaining defect 3). |
| 4 | Round-3 claims had no saved evidence, and the revision wasn't frozen | **Mostly fixed** | `round3/` now holds `run-all.sh`, 13 scripts with `*.out.txt`, `test.log` (89 of 89) and `build.log`, on `ad0864a6bcf2`. For example, `play.out.txt` records 73 steps and 24 videos with no bad entries. The revision still moved during my run, but only in media-task files. |
| 5 | Theme tokens didn't reach `html` | **Fixed on the client** | `_layout.tsx:27` sets the `themeStyle()` variables on `document.documentElement` in a `watch` whose cleanup removes them. The `display:contents` wrapper and the second `themeStyle()` call are gone (`root.json`: 42 inline vars, 0 wrappers). `accent-color` is `rgb(225,188,194)` and `scrollbar-color` is `rgb(255,148,178) rgb(18,15,16)`. The vars survive client navigation. Server-rendered `<html>` has no vars (see remaining defect 4). |
| 6 | The rail's rAF loop spun with the glitch disabled | **Fixed** | `CanvasScrollbar.tsx:81` adds energy only when `glitchAllowed()`. Under reduced motion, one 10-wheel burst plus 1.2 s now costs **10** rAF calls, against 51 in round 1 (`lifecycle.json` `railReduced`). Full motion settles in 22 frames and idles at 0 rAF/s. |
| 7 | Rail colours were snapshotted at mount | **Fixed** | `readColors()` runs in every `draw` (`:79`). After setting `--ui-cursor*` to `#00ff00` on `:root` and scrolling, the canvas thumb turned from `255,148,178` to `0,255,0` (`root.json`). |
| 8 | The width input let invalid values fail the save | **Fixed for the save, but it causes a typing regression** | `PageEditor.tsx:264-270` rounds and clamps to 40–1600. Kerf's `onChange` fires on every `input` event (`@kerf-js/core/src/dom-next.ts:136-148`), and a controlled `value` is written back unconditionally (`:259-261`). So typing "560" clamps "5" to 40 as soon as it's typed, and the field never reaches 560 (see remaining defect 1). |
| 9 | Fallback literals were outside the parity test | **Fixed** | The new test "every hard-coded colour fallback for a theme token equals the theme default" covers both CSS `var(--…, #hex)` fallbacks and the rail's `token('--…', '#hex')` defaults. The Save dialog now hard-codes only `#ebebeb` body text and black scrims (`media-download.css:10,13,19,62`). |
| 10 | Nits: dead import, mosh timers | **Fixed** | `mosh.ts` clears its timers and strips any burst still showing on dispose. `SourceImage` is no longer imported by `InlineVideo.tsx` or `VideoEmbed.tsx`. |
| 11 | Ownership of out-of-scope changes | **Attributed** | DECISIONS round 3b assigns the `MediaDownload.tsx` / `lib/media-download.ts` Save path and the 19:02–19:08 playback edits to the concurrent media task. It states the "Everything" pipeline run was at the owner's request. I can't verify who made each change from the tree. I accept the attribution and keep those changes outside this sign-off. |

## Regression re-checks on `644c5eb17a1a`

- **Menu `closing` → `closed`** (`lifecycle.json`). Times are from the close action until the menu is gone, at 390 touch on `/mechanics`. Nothing is left inert, and the race (reopening 50 ms into closing) ends open, then closes cleanly (full 299 ms, calm 189 ms).

  | Mode | × | Escape | Link |
  |---|---|---|---|
  | full | 350 ms | 321 ms | 378 ms |
  | calm | 220 ms | 214 ms | 269 ms |
  | off | 29 ms | 30 ms | 111 ms |
  | reduced | 0 ms | 0 ms | 53 ms |

- **Listener leak:** listener counts are identical by type across 12 client navigations (`leak diff []`). Console: 0 page errors.
- **Playback** (`video-home.json`, `video-archive.json`, `direct-tile.json`):

  | Page | Videos | Visible-video checks | Stuck | Playing off screen | Broken images |
  |---|---|---|---|---|---|
  | home 1440 | 8 | 35 | 0 | 0 | 0 |
  | archive 390 | 23 tiles | 38 | 0 | 0 | 0 |

  - On the archive, all 23 stills loaded.
  - The direct "Everything" tile plays, pauses off screen and resumes. It now uses `delivery: adaptive-hls`, a media-task change.
  - Home shows 8 videos rather than 24 because of the media task's newer lazy delivery. No visible video was paused.
- **Bursts** (`bursts.json`):
  - Each hover parked on a nav link starts 1 burst (12 of 12).
  - Presses land 9 of 9 by mouse and 9 of 9 by touch.
  - The first two runs crashed: once on a page reload while a media file changed, and once when my fixed 900 ms wait for the menu ran out while the video probe was loading the machine. I changed only that wait to `waitForSelector`, and the next run recorded no slow opens.
- **Content scope** (`content-scope.txt`): `/mechanics` is still the only page that differs from HEAD. The only field changes are widths 612/560/960 and `ratio: 1` on `mechanics-original-video-2` (8oZCxzC), as claimed. Both `site.json` copies are byte-identical.

## Scores

### 1. Framework and engineering quality: 8/10

- The round-1 leak is gone, measured.
- `:root` ownership is a single `watch` with a symmetric cleanup.
- The rail reads live tokens, and the mosh installer disposes completely.
- Listener counts are stable across navigation.
- **Remaining:**
  - `glitchAllowed()` still runs a `querySelector` per frame and per scroll event (nit).
  - VideoEmbed's deferred `destroy` depends on `element.isConnected` after a `setTimeout(0)`. If the watch re-runs while the iframe is still attached, the player is skipped rather than destroyed. No current path does that.

### 2. Correctness and robustness: 8/10

- All lifecycle paths verified clean: menu in four modes plus the race, still gate, direct tile, Vimeo fallback, presses and hovers.
- **Held back by:**
  - the width-field typing regression introduced by the fix (remaining defect 1);
  - the theme version check rejecting the whole stored content when `accentVersion` isn't exactly 2 (remaining defect 2);
  - the sticky `unavailable` flag (remaining defect 3).

### 3. Token and theme architecture: 8/10

- There is one derivation, `accentFamily()`.
- Hover colours are derived when unset and explicit when set.
- The stored model is versioned.
- Tokens are on `:root`, so html-level consumers follow the theme.
- A test enforces that every hard-coded fallback equals the default.
- **Remaining:**
  - Server-rendered `<html>` has no variables, so a custom saved theme reaches the native scrollbar, `accent-color` and the global overlays only after hydration (remaining defect 4).
  - The version literal is brittle (remaining defect 2).

### 4. Verification and test coverage: 8/10

- 89 of 89 tests pass.
- New tests cover the round-1 gaps: the v2 round trip, a deliberate legacy pick, a custom-base hover, navigation hover following the logo, and fallback parity.
- The implementer's browser checks are now saved and re-runnable (`round3/run-all.sh`).
- **Remaining gaps:**
  - nothing tests the width input's behaviour, which is how defect 1 got through;
  - lifecycle behaviour is still verified only by browser scripts, not by the suite;
  - the build audits no pages.

### 5. Scope discipline: 8/10

- This pass's code touches no server, auth or save code.
- Content edits are limited to `/mechanics`, and both copies are identical.
- Out-of-scope changes are now attributed in DECISIONS and kept out of this sign-off.
- **Held back by:** the owner-requested "Everything" pipeline run and manifest entry. That is an exception to "no encoding / playback selection", approved by the owner, and it overlaps the media worker's area.

| Category | Score |
|---|---|
| 1. Framework and engineering quality | **8/10** |
| 2. Correctness and robustness | **8/10** |
| 3. Token and theme architecture | **8/10** |
| 4. Verification and test coverage | **8/10** |
| 5. Scope discipline | **8/10** |

## Verdict: PASS

The pass is at the threshold, with no unresolved major defect in public or visitor-facing behaviour.

**Condition:** remaining defect 1 is an admin regression introduced by this round's fix. It should be fixed before the owner edits `/mechanics` widths in the studio. I couldn't exercise it in the browser, because I didn't log in to admin, so it rests on Kerf's `onChange` and `value` semantics as read from the installed source.

## Remaining defects, ranked

1. **Moderate (admin): the width field can't be typed into.**
   - **Where:** `src/admin/PageEditor.tsx:264-270`.
   - **Cause:** Kerf `onChange` fires on each keystroke (`dom-next.ts:136-148`), and the clamped value is written straight back to the controlled input (`dom-next.ts:259-261`). Typing "560" becomes 40 at the first digit, then 406, then 1600. Only the spinner arrows or a paste work. This is high confidence from the code; I didn't run it in the browser.
   - **Fix:** keep the raw digits while typing. Clamp only on `blur` or `change`, or clamp in the schema with `z.preprocess` and show the range as help text. Add a test for the clamp helper.
2. **Minor: a stored theme with any other version breaks the whole content parse.**
   - **Where:** `src/lib/theme.ts:171`, `z.literal(2)`.
   - **Cause:** any other `accentVersion` (a future 3 read by a rolled-back build, a hand edit, `null`) is rejected. Because `theme` sits inside `contentSchema`, the whole store fails to parse (`theme-probe.txt`: versions 1, 3 and `null` are all `REJECTED`).
   - **Fix:** accept `z.number().int().min(2)` and treat unknown higher versions as already migrated, or `.catch(accentVersion)`.
3. **Minor: VideoEmbed's `unavailable` flag never resets.**
   - **Where:** `src/components/VideoEmbed.tsx:24`.
   - **Cause:** after a transient player error, "Close player" and Play show the fallback without retrying.
   - **Fix:** reset it when `loadedSource` changes, for example in a `watch` on `loadedSource.value`, or derive the flag per load.
4. **Minor: a custom saved theme isn't in the server-rendered HTML.**
   - **Where:** `src/routes/_layout.tsx:27`.
   - **Cause:** the variables are set on `:root` in `onMount`. With a non-default theme, html-level rules and overlays show the CSS defaults until hydration. The default theme is unaffected, because the CSS literals match it.
   - **Fix:** also emit the variables in the server output, as a `style` on `<html>` or a small `:root{…}` block through the head/meta API.
5. **Nit: `glitchAllowed()` queries the DOM per frame.**
   - **Where:** `src/components/CanvasScrollbar.tsx:34`.
   - **Fix:** cache it from the reduced-motion media query and a `data-motion` observer.
