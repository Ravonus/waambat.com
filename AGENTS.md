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

Use `observeMediaViewport` from `@kerf-js/media/browser` for document galleries.
The viewport lifecycle keeps manual pause, reduced motion, Save Data, menu state
and hidden tabs authoritative. Preparation may attach the next source and load
its sharp first frame; anticipation starts muted playback just before entry.
Use Veneer's `scrollPage` helper for document scrollbar destinations so the same
predictor can prepare a landing area without loading every skipped artwork.
Track clicks are smooth by default; `behavior="instant"` keeps a direct jump.
Thumb dragging stays instant. Do not add a second per-video scroll listener.

Video stills must come from the acquired original at frame zero and use Kerf's
exact-pixel first-frame provider (`target:100`, `scorer:'none'`, no blur placeholder).
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

The header wordmark sits above the desktop nav without moving the nav baseline. The home hero carries its own
WAAMBAT wordmark below that same nav row; keep the nav at the same vertical
position when switching between Home and interior pages. Preserve the sigil and
the single shared sliding indicator.
