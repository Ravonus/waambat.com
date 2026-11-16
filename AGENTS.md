<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Published settings and artist handoff

The current WAAMBAT GA4 stream is `G-9HMWC8RFE0` in the Ravonus account; it is
a replaceable public setting, not a credential. The stream was created for
`https://waamb.at` with Enhanced measurement off.

The public settings contract is `Content.integrations` and `Content.seo` in
`src/lib/content.ts` (and the Native Kerf copy under `kerf/src/lib/`). Admin →
**Search, sharing & analytics** edits the same document as pages and contact forms.
An artist or agent can swap properties without changing source or redeploying:

1. Read the current authenticated `/api/admin/content` document (Native:
   `/_kerf/x/waambat/admin/content`) and retain `revision` and `publishedRevision`.
2. Change only `draft.integrations.googleAnalyticsId` to the owner's `G-…` ID and
   `analyticsEnabled` to the requested state. Never paste credentials, a GTM ID,
   an unrelated project's ID or a service-account secret into these public fields.
3. Save with the current revision, inspect the private draft preview, then publish
   that saved revision using the existing admin UI/API. Preserve concurrent edits;
   reload on a conflict. Draft settings must never activate public tracking.
4. Read back the published settings and the live public site. Confirm one page view
   per committed navigation in the correct GA4 stream and none for admin/preview.
   Keep Enhanced measurement off in that stream: the app owns page views and omits
   query strings, fragments, referrers and all contact form contents. Localhost and
   deployment previews do not send analytics. Disable tracking before retiring a property.

`integrations.googleSiteVerification` is the public Google Search Console HTML-tag
value. It is empty until the owner supplies a verified property token. DNS ownership
and search-engine indexing are separate from rendering correct metadata.

`seo.homeTitle` defaults to exactly `waambat`; `description`, `socialImage`,
`artistImage`, and `logo` are editable. Per-page `seo` overrides remain available.
The sigil accompanies the WAAMBAT text; never replace the wordmark with an image.
Upload image assets with the existing media controls and retain their immutable URL.

Share cards are served by `/social-card.jpg` from the current **published** content,
including custom page metadata, artist image and sigil. Their input hash changes on
publish, the response revalidates with an ETag, and stale revisions redirect to the
current card. The old committed `social-images.json` is only a static fallback.
Do not regenerate that manifest and claim it reflects later admin publications.
Netlify serves public images from its CDN, outside the server function filesystem.
Use `readCardImage` for published card inputs; retain its canonical-host, image,
size and timeout bounds, and verify the deployed JPEG endpoint itself.
Render card text with `@kerf-js/start/og` and its bundled font; serverless hosts
have no guaranteed system fonts. Visually inspect a deployed card after changing it.
Robots and sitemap read the public deployment state; archived, private and noindex
pages stay out. Verify HTML metadata, card bytes, canonical URLs and sitemap after
publishing. Both the Next production renderer and Native Kerf implementation must
keep this contract until the hosting cutover is explicitly verified.

Display the domain as **WAAMB.AT** in user-facing text, labels and share-card
artwork. Preserve the WAAMBAT artist wordmark and artwork titles. URL parsing,
DNS, HTTP hostnames and browsers normalize hostname case; use one stable canonical
URL and do not introduce uppercase/lowercase redirect loops to change the address bar.

## Predictive playback and page scrolling

For new standard media placements, use Kerf's `media()` + `mediaFfmpeg()` pipeline
and `Media` renderer. Exact frame-zero previews, display-quality selection and bounded
background caching are framework defaults; do not replace them with a blur placeholder
or a site-owned warm timer. Keep the installed Core and Media packages together.
After an upgrade, rebuild imported assets and re-ingest persisted legacy video records.
`kerf agents-md` regenerates the installed plugin contract for agents.

Use `observeMediaViewport` from `@kerf-js/media/browser` for document galleries.
The viewport lifecycle keeps manual pause, reduced motion, Save Data, menu state
and hidden tabs authoritative. Preparation may attach the next source and load
its sharp first frame; anticipation starts muted playback just before entry.
Use Veneer's `scrollPage` helper for document scrollbar destinations so the same
predictor can prepare a landing area without loading every skipped artwork.
Track clicks are smooth by default; `behavior="instant"` keeps a direct jump.
Thumb dragging stays instant. Do not add a second per-video scroll listener.

Retain frame zero from the acquired original using Kerf's exact-pixel first-frame
provider (`target:100`, `scorer:'none'`, no blur placeholder). Keep this provenance record; the display pipeline below uses a measured version
of the same frame. When an opening is black, the measured black-opening exception below uses a
separate lossless preview from that same original.
Playback pins the display-sized HLS rendition before loading any segment. Network
hints must not force a blurry starting rendition. Reveal video only after a presented
frame reaches the chosen dimensions; `playing` alone is insufficient. Keep that
rendition and source through pause, scroll return and loop restart. Native HLS uses
the selected single-rendition playlist. Warm the actual responsive playback source
(`data-media-start`), independently of its exact original Save URL, with the current
viewport first. Start the serial background queue immediately, pause it for foreground
buffering, and allow real clear fragment sizes (currently up to 7.3 MB). Verify first
decoded dimensions, a complete loop, scroll return and an actual cache hit in a fresh
browser; Lighthouse scores alone do not prove sharp playback.

An exact frame zero may be an authored black opening. `npm run media:starts` scans
the prepared legacy catalog at build time, retains those exact zero records, and
uses Kerf's `createFirstFrameBuild({at})` to generate a separate lossless visible
preview. The timestamp, pixel verification and responsive sources are stored in
`first-frames.json` under `assets[id].startup`; committed preview files live in
`public/video-previews/`.
`prepare-first-frames.mjs` performs the same analysis for newly prepared movies.
Keep the preview visible until a presented video frame reaches `startup.revealAt`.
Never seek or trim the original, sample video pixels in the visitor's browser, or
replace a full-resolution preview with an enlarged old thumbnail. Later black
scenes remain part of the artwork. Respect native/no-frame-callback browsers too.

The header wordmark sits above the desktop nav without moving the nav baseline. The home hero carries its own
WAAMBAT wordmark below that same nav row; keep the nav at the same vertical
position when switching between Home and interior pages. Preserve the sigil and
the single shared sliding indicator.

The hero and header marks opt into Kerf navigation with matching `data-kerf-shared`
keys; text also uses `data-kerf-shared-fit="text"`. Kerf captures before the optimistic
path change. Do not restore an app-owned navigate wrapper or duplicate flying logo.
`data-kerf-motion` follows the artist's motion setting. Keep the artwork live below it.
The local navigation experiment reveals the existing desktop controls on upward
scroll and a small phone dock for NFTs, Ordinals and the full menu. Hide it while
scrolling down or editing a form, and after two seconds without scrolling or pointer
interaction; retain the original menu's arrival/close lifecycle. Keep one positioned
header layer and its measured spacer so scrolling never changes the artwork's layout.
A shared arrival must permanently skip that hero instance's cold wordmark entrance;
re-enabling the intro when the shared-animation flag clears causes a second flash.
The sigil matches the title's cap height. Footer socials are icon-only, with accessible
names, and open the artist's verified destinations in new tabs.

Contact fields use Veneer's `field`, `floatingLabel`, `formReset` and Kerf `use` binding.
Preserve the site's pastel theme and existing Send Message button. Empty labels rest
inside; hover, focus or a value lifts them across the border using the measured notch.
Keep native form values, validation and reset behavior alongside the custom dropdown.

## Delivery and production verification

Keep the full `local-media.json` inventory for encoding and original-file provenance.
Browser image components use the generated `image-media.json` view: image records,
responsive formats and exact Save metadata, without video records or blur placeholders.
`npm run build` restores the verified media release and regenerates that view through
the declared `build.prepare` task. Both media preparation/indexing scripts regenerate
it too. Do not hand-edit the generated image index or flatten animated images.

Public responses use `publicContent`, then `shellContent` for the persistent frame
and `routeContent` for the destination gallery. Do not send the whole content document
twice on every page. Preserve published metadata and hero data; notification recipients,
email configuration and archived content stay out of public responses. Archive source
repairs are a versioned, one-time migration. Artist replacements or subsequent restores
must remain editable. Archive works whose movies are unavailable keep their retained
thumbnail with `previewOnly: true`; they remain public. `ArchivePreview` reveals a
compact title/description on hover, keyboard focus or tap, with a smooth opacity/slide
transition and a reduced-motion override. Do not mount a player, add playback/expand
controls, or send these entries through the fullscreen viewer. The admin thumbnail-only
toggle and description remain editable. Hide a work with `archived` only when the owner
explicitly wants the entire entry removed. Source migration version 2 restores the 13
entries hidden by version 1; it never reapplies after later artist edits.

Start legacy-gallery warming from `NavigationArrival` after the committed route mounts.
An optimistic pathname change can still have the outgoing DOM; scanning it warms the
wrong page. Keep using Kerf's shared bounded queue and `mediaHlsConfig`.
Use `supportsMediaStreaming` before importing the controlled HLS player; native HLS
is a fallback because it ignores the gallery's short buffer limits. Native-only
browsers skip that import. Intermediate attachment failures must advance
through the pinned-playlist/native-file fallbacks before showing an unavailable message.

Run `npm test`, `npm run typecheck`, `kerf check --json`, `npm run build`, then
`npm run verify:built` in `kerf/`. The current SSR build's automatic static audit finds
zero pages; that is not coverage. `verify:built` starts one temporary production server,
requires all eight primary routes at phone and desktop widths, saves its report under
`.kerf/audit/`, and stops its server. Check actual playback, first decoded dimensions,
scroll return and forced segment failure separately. The installed `kerf test --gate`
currently requires Vitest while these contracts use `node:test`; record that limitation,
never describe the mutation gate as passed. Regenerate `kerf/AGENTS.md` from config
with `kerf agents-md` after changing tasks; keep site-specific instructions here.

## Measured display previews and mobile performance

Use `npm run media:previews` to build legacy display previews through Kerf's
`createFirstFrameBuild` and `createMediaBuild`, with SSIMULACRA2 target 90,
responsive widths 384/672/960/1600, and no blur placeholder. `first-frames.json`
retains the exact source records. `display-previews.json` holds the separately
measured display images and opening timestamps. Static-image renditions are
independently scored at every delivered width; formats below the floor retain
the exact fallback. Animated images and SVGs keep their existing specialized
pipelines. Exact acquired originals and original-file Save metadata never change.

Only the route's first visible media gets eager/high priority. Do not promote a
below-the-fold image because it is the first image after a video. Keep the sharp
picture above its native video until a presented full-size frame is ready; the
video itself can show its cached poster from attachment. `useAdaptiveVideo` marks
foreground preparation for Kerf's shared background queue, so speculation yields
to the current artwork. Do not reset quality on pause or scroll return.

`build.prepare` verifies all committed preview files and rebuilds the image view;
deployments do not need the local scorer or FFmpeg. Re-run real cold mobile
Lighthouse on all eight routes after publishing. Kerf's accessibility/SEO/layout
audit is a different gate and must never be reported as a performance score.

Browser video helpers import only `video-previews.json`, generated alongside the
image delivery index. Exact source frames, encoding receipts and static-image
records stay in build/server modules. Do not import the full `display-previews.json`
or `first-frames.json` into a browser component; they substantially increase the
critical module graph. Source-frame provenance is in `source-frame.server.ts`.

Kerf Start owns priority-artwork startup: code is prefetched while the sharp SSR
image loads, then hydration follows its first paint. Captured interaction wakes
startup immediately and a failed-resource deadline prevents a blocked app. Keep
this shared behavior; do not add an app-owned hydration delay.

Retained archive thumbnails also use Kerf's `observeMediaViewport`. Native image
lazy loading alone fetches several screens ahead and competes with the first
painting. Keep their existing button, layout and caption; activate the image
when Kerf prepares its viewport, and retain the no-script image fallback.
