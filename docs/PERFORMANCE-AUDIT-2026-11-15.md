# WAAMBAT delivery audit — 15 November 2026

Follow-up: the owner chose to retain the 13 unavailable archive works as thumbnail-only
entries with compact hover/tap captions. All 25 entries are now visible; ten play local
videos, thirteen use `ArchivePreview`, and two remain stills. Preview entries never
attach a player or open the fullscreen viewer. The measured tables and the original
12-entry playback receipt below describe commit `4bf02b3`, before this follow-up;
they are not new transfer measurements for the restored 25-entry archive.

The approved artwork layout, navigation, fields, Send Message button and icon-only
footer are preserved. These changes are local on `ui/art-first-navigation`; this
audit does not establish that they are deployed on WAAMB.AT.

## Results

The archive had 15 unavailable players among 25 entries. Two named works already
had verified local copies: Axiom GL0w Up and Sus Singularity now use those copies.
At the owner's request, the other 13 unavailable entries are archived. The deleted
`3hhNUKR` Mechanics clip is archived too. The records and assets remain available
in admin; the migration runs once and preserves later artist replacements/restores.

The final archive has 12 visible entries: ten locally served videos and two stills.
An actual scroll-through observed all ten playing, every poster loaded, and no
unavailable states, page exceptions, failed requests or HTTP errors. Blocking HLS
segments with HTTP 503 recovered to the 960 × 1707 MP4 with a presented frame and
no error state. This verifies the failure path as well as successful loading.

Measured transfer sizes in bytes, with a fresh browser context for each route:

| Route | JavaScript before | JavaScript after | Reduction | HTML before | HTML after |
| --- | ---: | ---: | ---: | ---: | ---: |
| NFTs `/` | 261,959 | 150,309 | 42.6% | 35,627 | 19,225 |
| Art archive | 283,920 | 164,747 | 42.0% | 33,998 | 15,029 |
| Ordinals | 261,963 | 150,313 | 42.6% | 31,953 | 31,049 |
| Contact | 275,076 | 163,243 | 40.7% | 32,993 | 14,970 |
| Bio | 188,891 | 164,747 | 12.8% | 33,315 | 23,350 |
| Mechanics | 188,891 | 164,747 | 12.8% | 31,897 | 14,346 |
| Blog + press | 276,580 | 164,747 | 40.4% | 33,573 | 16,542 |

Baseline: `372afe3`. Both source versions were built independently with the same
locked dependencies and verified assets on Yuna. Chrome 157.0.8103.51, 390 × 844,
DPR 2, 4× CPU throttling, 100 ms latency and 200,000 bytes/second download; ten
seconds per route. Chrome in this run supports native HLS. Other browsers that
need hls.js will still download its deferred chunk. These are measured transfer
comparisons, not a new PageSpeed score or a statistically repeated timing study.
All seven final probes reported no page exceptions or horizontal overflow.

## Delivery changes

- Generate a 297,147-byte image-only catalog from the 479,468-byte media inventory.
  Remove 139 video records and 331 unused blur payloads from image rendering data.
  Retain animation, responsive AVIF/WebP sources and exact original Save metadata.
- Send page bodies only to their destination route. The persistent frame receives
  navigation, theme, metadata and hero data. Exclude archived records and private
  notification settings from public data.
- Resolve legacy fallback posters through the optimized image catalog. Use low
  fetch priority for deferred stills and reserve priority for the hero/LCP image.
- Start Kerf's bounded warming queue after the destination DOM is committed.
  Keep display-quality pinning, exact first frames, original Save assets and the
  existing cost-based container/frame encoder choices.
- Prefer pinned native HLS before importing hls.js. Suppress only intermediate
  attachment errors while progressing to fallback; retain a real final error state.
- Calculate archive row geometry in CSS from authored ratios instead of a guessed
  initial width and ResizeObserver correction. Verify desktop rows and individual
  phone tiles within one pixel of their expected geometry, with no overflow.
- Settle initial fixed-header padding before enabling later navigation transitions.
  The desktop trace stays at `y=60` through the static-to-fixed handoff; measured
  startup CLS is 0.0000115, from the sigil's font-related size adjustment.

No original artwork was re-encoded or removed. This pass improves delivery and
fallbacks; existing encoding quality and exact-original recovery remain intact.

## Verification and reproducibility

From `kerf/`, run `npm ci --ignore-scripts`, `npm test`, `npm run typecheck`,
`kerf check --json`, `npm run build`, then `npm run verify:built`.

- Clean locked install and both production builds succeeded.
- All 115 Node contracts passed; TypeScript reported zero errors.
- Source check: zero errors and five existing warnings (three admin theme entry
  subscriptions, one contact error subscription, one conditional-heading outline
  warning). The rendered-page audit found no heading failures.
- The real production audit covered all eight primary routes at phone and desktop
  widths: zero errors and zero warnings. Instagram is included in this audit even
  though the seven-route transfer comparison predates that addition.
- Full archive playback, geometry, startup-shift and forced-segment-failure probes
  passed. The local user-facing preview remains at `http://localhost:3287`.

The installed `kerf build` static audit discovers zero pages in this SSR app.
`verify:built` therefore starts an owned production server, requires eight real
route results, saves `.kerf/audit/public-routes.json`, and always stops its server.
Do not count the build's zero-page audit as coverage.

The installed `kerf test --gate` returns `E_NO_VITEST`: this project uses
`node:test`, while the current mutation gate requires Vitest. The Node contracts
passed; the framework mutation gate did not run. Supporting Node's runner in that
gate is a framework follow-up. A dev-server module lookup also required a restart
after adding a new generated JSON file; the running preview was restarted and
verified. Neither limitation was hidden by changing the test suite or UI.

The bounded receipt is [optimization-2026-11-15.json](../evidence/optimization-2026-11-15.json).
Detailed local probes and screenshots are in the workspace's
`outputs/site-optimization/yuna-results/`. Temporary remote dependencies, media
copies, builds, test servers and browser workers are removed after verification.
