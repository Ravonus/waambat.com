# Accessibility and responsive critic: pastel accent pass (round 1)

Reviewer: independent a11y/responsive critic (not the implementer). No source files were edited.
Tested: the live preview at http://localhost:3287 (headless Chromium via playwright-core 1.64.1, axe-core 4.14.0) on
2026-11-14. The working tree on `polish/pastel-accent-ui` (base 412b456) changed while I was testing. One example: `.option[data-active]`
switched from `--ui-accent-hover` to `--ui-accent`. At the end of testing, the diff fingerprint was
`git diff -- kerf/src kerf/test ':!kerf/src/content/media-downloads.json' | shasum` = `3933e2010dff`. The preview also hot-reloaded
twice mid-run. Results apply to what was being served at the time and need a recheck against the final revision.

**Scope change during review.** The owner has since asked for: the cursor and all headings in wordmark pink `#ff94b2`; a
redesigned mobile menu, hamburger, close button and side scrollbar with open/close animation; and deliberate
datamosh/glitch effects on hover, click, input and menu animation. My mobile-menu, reduced-motion and cursor-animation
findings below are therefore **superseded, re-review in round 2**. They describe the build I tested only. Contrast, focus,
form, select, Save dialog, color-scheme, overflow, zoom and axe findings still apply.
I observed headings rendering `rgb(255,148,178)` = `#ff94b2` at the end of testing (the Save dialog `h2`, which reads
`--color-waambat-pink`). That is 10.13:1 on black. Any new glitch effect has to keep a reduced-motion path and must not flash
more than 3 times per second (WCAG 2.3.1). Check that in round 2.

Evidence (scripts, JSON and screenshots): `evidence/ui-refinement/reviews/a11y/`
(`axe-after.json`, `links.json`, `focus-order.json`, `responsive.json`, `contrast-table.md`, `shots/*.png`).

## Findings

### MAJOR 1: The custom select's keyboard-active option is barely distinguishable (WCAG 1.4.11, relates to 2.4.7). Pre-existing, slightly weakened.
- Active option: background `#201a1b` on listbox `#120f10` = **1.11:1**. Its text goes from `#ebebeb` to `#e1bcc2` =
  **1.45:1** against the rest-state text. DOM focus stays on the combobox, so this highlight is the only cue for which
  option Enter will choose.
- Baseline was also below 3:1 (bg 1.21:1). Its text, however, shifted to hot pink `#ff94b2` (1.74:1 plus a clear hue change). The pastel
  text now reads almost white, so the cue is weaker than before.
- Forced colors: the active option renders white on black with no outline, so it is **invisible** (pre-existing).
- Evidence: `shots/select-open-selected-vs-active.png`, `shots/forced-colors-listbox.png`, form.mjs output.
- Suggested fix, within the design lock: give `[data-active]` a non-color cue, such as an inset 1px `--ui-accent` ring or a 2px
  left bar. Add `outline: 1px solid Highlight` under `forced-colors: active`.

### MAJOR 2: Text-field and combobox focus is invisible in forced-colors mode (WCAG 2.4.7). Pre-existing, not introduced.
- `.control { outline: none }`, and the focus ring is a `box-shadow` that forced colors strips. With `forced-colors: active`, the focused input and combobox
  showed `outline: none`, and the frame kept the same 1px CanvasText outline as at rest. Nothing changes on focus.
- Submit and nav links do show the system focus ring (2px) in forced colors.
- Evidence: `shots/forced-colors-input-focus.png`, schemes.mjs output.
- Fix: under `@media (forced-colors: active)`, add `.frame:focus-within { outline: 2px solid Highlight; }`.

### MINOR 3: Client-side validation is announced only by the native bubble; `aria-invalid` stays `"false"` (WCAG 3.3.1, 4.1.2). Pre-existing.
- Submitting the empty form sent no POST (verified: 0 requests). Native validation focused "Your name" and showed
  "Please fill out this field.". The fields match `:user-invalid`. But FormField hard-codes `aria-invalid={!!error}`, so Chrome's
  accessibility tree reports `invalid="false"` on all three required fields. There is also no visible invalid styling: the
  `#ff7070` ring appears only for server errors.
- Labels are correct: all fields have programmatic names, `required` is set, and the "*" is `aria-hidden` and explained by the "* Required" text.
- The server-error path (`aria-invalid="true"`, `aria-describedby` → error text, `--ui-danger` 7.8:1, a `role=status` live region that takes focus)
  was not exercised, because that requires a real POST. It is verified from source only.

### MINOR 4: The heading-embedded link "(in discord)" on /mechanics can't be told apart from the heading (WCAG 1.4.1). Pre-existing.
- `.source-heading-link { color: inherit }`, with no underline: 1:1 against the heading text. Its hover is now `#f1d1d6` (previously
  `#ff7070`), so the hover cue is subtler than before. The same class on /blog-press and /contact links is standalone, not inline.

### MINOR 5: Focused Instagram "View on Instagram ↗" links end up below the fold (WCAG 2.4.11). Pre-existing, third-party.
- After tabbing, the focused link sat at y=998 in a 900px viewport. The embeds grow after the focus scroll.
  Evidence: `shots/instagram-focus-13.png`. Not related to the pass.

### NIT 6: The Save button label renders light at 1x.
- `#221014` on `#e1bcc2` computes to 10.57:1, but it uses Europa weight 300 at 14px and antialiases to mid-grey at DPR 1 (`shots/save-dialog-save-focus.png`).
  At 2x it is crisp (`shots/save-button-2x.png`). Baseline used the same weight.

### NIT 7: Some targets under 24px. Pre-existing, unchanged geometry.
- Footer social links are 14px tall. Ordinal titles and source links are 15–17px tall. The archive viewer close button is 20×58, and info/prev/next are 23–27×25.
  Most likely pass 2.5.8 through the spacing exception (24px gaps). None of these sizes changed in this pass.

### Superseded, re-review in round 2 (mobile menu, motion, cursor)
These passed in the build I tested and need retesting after the redesign:
- Mobile menu (390/360/320): Enter opens it and focus goes to "Close menu" (76×44, `#fff`, ring `#e1bcc2`). Tab and Shift+Tab are trapped. Links are 44px tall and none are clipped.
  Escape closes it (also under reduced motion), `aria-expanded` resets and focus returns to "Menu". A menu link navigates, focus moves to `main`
  and the scroll lock releases. At 720px/200% zoom the menu panel scrolls (606 > 450) with no horizontal clipping.
- Reduced motion (emulated `reduce`): no running animations at all (`document.getAnimations()` empty). Cursor sheen
  `animation: none`, nav-link transitions 0s, listbox open animation none, submit slide 0s, Save dialog entrance and spinner none,
  nav pending spinner none, skeleton shimmer none. The control (`no-preference`) showed all of them running, so the emulation worked.

## Contrast: measured values (full table: `a11y/contrast-table.md`)
| State | Colors | Ratio |
|---|---|---|
| Inline link text / hover / pressed on black | #e1bcc2 / #f1d1d6 / #c39ca2 | 12.17 / 14.83 / 8.60 |
| Inline link vs body text (color only) | #e1bcc2 vs #ebebeb | 1.45, so the **underline is required**; it is present (`underline`, 1px, #715e61, 3.48:1 on black) and turns currentColor on hover |
| Nav default / hover / current / pressed | #9c9c9c / #f1d1d6 / #fff / #c39ca2 on black | 7.65 / 14.83 / 21 / 8.60; current also has the underline |
| Focus ring (2px #e1bcc2) on page / on Save dialog | | 12.17 / 11.05 |
| Field boundary at rest (body 40%) vs inner surface / page | #636363 | 3.33 / 3.50 |
| Field focus ring 1.5px; change vs rest boundary | #e1bcc2 | 11.21; 3.48 |
| Floating label rest / focused; select placeholder | | 8.73 / 11.21; 5.42 |
| Checkbox/radio border (none on the live form) | #715e61 | 3.31 on surface (baseline 3.99) |
| Option text rest / active | | 15.99 / 9.94 |
| Submit text on fill; hover/focus (black slide-in) | #221014 on #e1bcc2; #e1bcc2 on #000 | 10.57; 12.17 |
| Submit busy (opacity .8) | | 7.0 |
| Error text / error ring | #ff7070 | 7.80 / 7.43 |
| Save dialog: body, heading, kicker 10px, copy 13px, info 11px, cancel 11px | on #120f10 | 15.97, 11.05, 11.05, 10.15, 5.70, 8.78 |
| Save button rest / hover / pressed | #221014 on #e1bcc2 / #f1d1d6 / #c39ca2 | 10.57 / 12.87 / 7.46 |
| Selection highlight | #221014 on #e1bcc2 | 10.57 (baseline white on #9457ff was 4.14, a failure; **fixed by this pass**) |
| Disabled token | #5a4b4e | 2.55 (disabled controls are exempt) |
| Headings after the direction change | #ff94b2 on black | 10.13 |

## Keyboard, focus order and dialogs (desktop 1440, phone 390)
- The order is logical on /, /contact, /art, /ordinals, /instagram: skip link, scroll rail, logo/nav (desktop) or Menu (phone), then content, form, footer.
  Every stop showed a visible indicator: a 2px `#e1bcc2` outline (offset 3–10px), a 1px outline on the scroll rail, or the form-frame 1.5px inset ring.
  No stop had opacity 0. Evidence: `focus-order.json`.
- Custom select: ArrowDown opens it and sets `aria-activedescendant`; Enter chooses and keeps focus on the combobox; Escape closes with focus kept;
  an outside click closes it. The selected option has a check icon (11.05:1) plus `aria-selected`. Not color-only.
- Archive viewer: opening from the expand button focuses "Close archive viewer". Tab moves through iframe → info → prev → next.
  Escape closes and **returns focus to the expand button**.
- Save dialog (right-click, Save not clicked, no download): opening focuses "Close download". Tab cycles Save → Back → Close.
  Escape closes. Focus returns to whatever element was focused when the dialog opened. After a mouse right-click inside `main`, that was `main` itself.
  Keyboard users can't open Save (the context-menu key on a focused link doesn't target an `img`). That's pre-existing and part of the right-click contract.

## Responsive and zoom
- Horizontal overflow: **none** on all 8 pages at 320, 360, 390, 768, 1440 and 720px@2x (200% zoom). `scrollWidth == clientWidth` everywhere.
- Contact select popup stays within the viewport at 320/360/390/200%. The submit button (172px minimum) and "* Required" fit at 320.
- Save dialog fits with 16px gutters at 320/360 and is centered at 200%. The 390 measurement was lost to a preview hot-reload (`resp-w390-save-dialog.png` is
  invalid). It sits between the 360 and 768 results, both of which fit.
- Screenshots: `shots/resp-*.png`.

## Color schemes and native controls
- With `colorScheme` set to dark, light and no-preference, the contact page screenshots were **byte-identical** (sha1 `f4014698daea`). Computed
  `color-scheme: dark` on html, inputs, the hidden native select and the Save dialog in all three. `accent-color` is `#e1bcc2`.
  `scrollbar-color` is `#e1bcc2 #120f10` (used only when the canvas rail is absent). The dark presentation does not drift with the OS setting.
- Admin: only the login form was visited (no login attempted). axe found 0 violations. **Protected admin states are unverified.**

## axe-core 4.14 (after), desktop and phone, all pages plus /admin login
| Rule | Where | Origin |
|---|---|---|
| `region` (moderate) | `.waambat-scroll-rail` sits outside landmarks, on every public page | **Pre-existing.** It was a top-level child in baseline `_layout.tsx` too. The pass only wraps it in a `display:contents` div, which doesn't change landmarks |
| `page-has-heading-one` (moderate) | /art-by-waambat | Pre-existing (content not touched) |
| incomplete `aria-valid-attr-value` | `aria-controls` on Menu and the combobox points to elements rendered only when open | Pre-existing (components unchanged) |
| incomplete `color-contrast` | wordmark over image; submit text (axe can't resolve the pseudo-element background) | Measured manually above, passes |
| Console errors | /ordinals: 3× `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin` (third-party); /instagram: Instagram embed `ErrorUtils` and CSP report-only notices | Pre-existing, third-party |

**The pass introduced no axe violations.**

## What passes
Every interactive text state meets 4.5:1, and every focus ring and component boundary meets 3:1. Inline body links now have an underline as the
non-color cue (1.4.1). Selection contrast improved from 4.14 to 10.57. Focus is visible and ordered across the header, form, media controls
and dialogs. Escape and return-focus work for the custom select, the archive viewer and the Save dialog (and for the round-1 mobile
menu). Labels and required semantics are correct. There is no horizontal overflow at 320–1440 or at 200% zoom. Native controls stay
dark in every OS scheme. Reduced motion removed every animation and transition (round-1 build). Forced colors keep visible
focus on buttons and links. The remaining gaps are pre-existing: field focus and the active option in forced colors, the weak
active-option cue, and `aria-invalid` on client-side validation.
