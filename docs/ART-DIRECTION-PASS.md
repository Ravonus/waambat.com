# Art-direction pass and hero banner

Branch `design/art-direction-pass`, started from `main` at 9c63c10 after the modernization merge.

**Status:** implemented and checked locally. Committed locally; **not pushed and not deployed**. Nothing here has been seen on `waambat.netlify.app`, and nothing should be called live until the deployed build has been checked in a browser.

## Her visual language, and what it became

Before designing, every video on the site, LUX and Kismet Twist (recorded from the live inscriptions) and the interactive pieces were reviewed as frames and in motion. What carries across the work:

- A black ground. Colour is never a background; it comes from the artwork.
- Dense, saturated collage clusters that read as one creature or flower: faces, animals, cars, flames, hands, all upright and recognizable.
- A radial chromatic bloom around the bright centre, with red/blue fringing at the edges.
- Faces and bodies stretched into glossy ribbons; pixel-block mosaic that resolves into the image.
- A palette of pink, coral, crimson, amber and violet that is already in the site's tokens (`#ff94b2` wordmark, `#e1bcc2` headings, `#9457ff` links, `#ff7070` hover).

So the new motion is built from those, not from a preset: a stepped, slightly chromatic arrival (violet and coral fringe resolving to pink) for the wordmark and page titles; datamosh, mosaic and chromatic-displacement transitions in the banner; bloom and radial chroma in the montage; nothing rotated or restyled. No new colour, theme or font was added.

## Hero banner

A 24 second silent loop of her own works, rendered with the maintained Keel trailer plugin (not a disposable script). 34 source videos are used: 22 NFT paintings that still load, LUX and Kismet Twist, the art-archive videos, the bio animation, and the contact, mechanics and press videos (the three with embedded text only through text-free crops). Nine shots, each a main work with small satellites in screen/lighten blends, bridged by displacement, datamosh and mosaic transitions; the last shot hands over to the first so the loop has no visible join. No text is added over the artwork and no decorative shapes are drawn.

- `public/hero/waambat-hero-desktop.mp4` 1280×720 and `waambat-hero-mobile.mp4` 720×900, H.264, no audio, 3.72 MB and 2.77 MB (each under the studio's 4 MB upload cap, so she can replace them without a developer), plus a poster for each (the first frame).
- The wordmark is live text in the exact brand font and logo colour, set in the quiet left column (desktop) or top band (phones), clear of the artwork stage. A hero with an `logoSrc` image uses that instead.
- Home only: the banner fills the first screen under the navigation (`max-width` follows the video's own ratio, black sides on very wide screens, never cropped). The old header wordmark is hidden there so there is one wordmark, not two.
- Phones held upright get the portrait render, poster and composition. A phone on its side gets the landscape one, whole within the screen.
- Reduced motion and Save-Data show the poster until she presses play. A broken video shows an honest message and a retry control over the poster; nothing is hidden behind a placeholder.
- Playback follows the existing lifecycle: muted, looping, starts near the viewport, pauses offscreen, in a hidden tab, and while the mobile menu is open; a manual pause is respected through scrolling.

The whole montage is reproducible and editable in `keel/hero/` (`README.md` there has the details): composition generator, committed `timeline.json`, source provenance with hashes, fetch/capture/encode/render scripts, and the Keel plugin extensions it needs (`keel-trailer-art-montage.patch`, also on local branch `waambat-hero-materials` of the keel-trailer checkout, two commits on `63a55a7`, with their own tests).

## Editing it in the studio

The banner is an ordinary section with `Hero banner` placement, so the existing studio edits it, and saved content and her edits are untouched.

- Section title: the wordmark text. Hero item: video, mobile video, poster, mobile poster, optional logo image, width/height ratio, mobile ratio, archive. Archiving the section or the item removes the banner; moving it to another page moves it there.
- Theme: wordmark colour and font (as before), new "hero wordmark size" and "motion" (full, calm, off). The visitor's reduced-motion setting always wins.
- Content stored before the banner existed is shown with the default banner on read and never written back; her next ordinary Save persists it. An archived or edited banner is respected and never restored. The stored `heroVersion` field records this. Ids can only be archived, never removed, as before.
- Uploads reuse the existing uploader and its 4 MB limit and byte-signature checks; no auth or storage change.

## Polish across the site

- **Spacing:** the per-artwork gap from her original flow is unchanged on desktop and scaled to 40% on phones, where a 200px black gap read as a missing image.
- **Reveals:** artwork, captions and archive rows fade in and rise a short way as they are reached; caption titles resolve out of the violet/coral fringe; page titles arrive like the wordmark. They are scroll-driven CSS, so no script, no effect on the video lifecycle or layout, and they simply do not run where unsupported, with reduced motion, or with motion set to "off" ("calm" keeps the fade only).
- **Hierarchy:** captions keep the title strong and let year and medium recede; titles take the hover colour from the palette.
- **Navigation:** the underline for hover, focus and the current page carries the same violet/coral split; existing keyboard, touch, scroll-lock and history behaviour is unchanged.
- **Controls:** media controls and the LUX "Interact" gate get a logo-pink border/focus ring and a pressed state. The gate's behaviour is untouched.
- Left as designed: the archive mosaic, bio and Instagram character, the other pages' distinct layouts, the custom pink cursor, aspect ratios, source links and the LUX iframe and its state.

## What was checked

All on this Mac, headless Chromium 1234 (Playwright), production build unless noted:

| Check                                                                                                                                                                                                                                                            | Result               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `pnpm check` (eslint, tsc), `pnpm test` (45 unit tests, 12 new in `tests/hero.test.ts`), `pnpm build`                                                                                                                                                            | pass                 |
| `pnpm test:hero` (new): desktop/mobile/landscape renders and posters, one wordmark in the brand font, geometry, manual pause, offscreen/hidden-tab/menu pause, scroll lock and restore, reduced motion, failure state, no mobile fetch on desktop and vice versa | pass                 |
| `pnpm test:browser`, including a pre-banner store (not written on read), the studio editing the banner, preview and publish                                                                                                                                      | pass                 |
| `check-cursor`, `check-navigation`, `check-lux-interaction`, `check-mechanics-video`, `check-inline-playback`, `check-storage-outage`, `check-blob-runtime-context`                                                                                              | pass                 |
| 12 routes × 10 viewports (1440, 1920, 2560, 1024, 768, 390, 360, 320, 844×390, 667×375), production server: status, horizontal overflow, console errors                                                                                                          | 120 of 120 clean     |
| Animation, viewed frame by frame: wordmark arrival, a full 24 s loop at 1.5 s steps including seam and each transition type                                                                                                                                      | see `evidence/hero/` |

Captures are in `evidence/hero/` (behaviour checks, filmstrips, renders) and `evidence/art-direction/` (every route at 1440 and 390, the home page at all ten sizes).

### Not passing here, and not caused by this work

`check-private-preview` and `check-ordinal-presentation` fail on this Mac in the same way on the unmodified base commit (built and run in a separate worktree), so they do not regress with this change but are also not verified by it. `check-backup-auth` needs Docker and Postgres; the Docker daemon is not running here, so it was not run. Some of the existing scripts hard-coded `/usr/bin/chromium` or Linux's Control-click; they now honour `CHROMIUM_PATH` and use the platform modifier.

## Remaining limits

- **Browsers:** Chromium only. Safari and Firefox were not exercised. Scroll-driven reveals need `animation-timeline` support and are skipped elsewhere.
- **Hosted state:** her saved edits live in the Netlify Blobs store, which was not read. Compatibility was verified with a pre-banner seed in the local Git fixture, not on the real store. Hosted persistence of the new fields, and the new `/hero/*` cache header (one hour, revalidating) on Netlify's adapter, can only be verified after deployment.
- **Source media:** the dead Imgur files (Autocorrection and the first and third mechanics videos) and the provider-hosted archive videos could not be used or downloaded; the site still shows them as unavailable. The press strip and the second selfie video are low resolution. LUX needs a real GPU in real time to record; a recapture will differ in detail from the committed render.
- **Keel:** the plugin extensions are committed locally in the keel-trailer checkout and in `keel/hero/keel-trailer-art-montage.patch`; they have not been pushed to its remote.
