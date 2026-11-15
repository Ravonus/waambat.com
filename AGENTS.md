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
Robots and sitemap read the public deployment state; archived, private and noindex
pages stay out. Verify HTML metadata, card bytes, canonical URLs and sitemap after
publishing. Both the Next production renderer and Native Kerf implementation must
keep this contract until the hosting cutover is explicitly verified.

Display the domain as **WAAMB.AT** in user-facing text, labels and share-card
artwork. Preserve the WAAMBAT artist wordmark and artwork titles. URL parsing,
DNS, HTTP hostnames and browsers normalize hostname case; use one stable canonical
URL and do not introduce uppercase/lowercase redirect loops to change the address bar.
