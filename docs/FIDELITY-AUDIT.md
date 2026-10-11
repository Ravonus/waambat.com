# Fidelity review: recovered content and remaining composition

The renewed task authorizes an updated review preview through the existing Netlify Git integration. Production/domain changes remain out of scope. The user specifically corrected biography composition: a complete text migration does not establish visual fidelity.

## October 11 public-source handoff applied

The research handoff reports all twelve original routes returned HTTP 200, supplies original public-site destinations/media and production CSS values, and identifies the exact Adobe loader with its published-domain license check. These supplied source facts resolve the content/destination gaps below. They do **not** supply original rendered captures, biography rows/column spans, individual image placement, spacers, rich-text emphasis or page-specific breakpoints. The cloud browser/curl proxy still rejects original-site and remote preview requests with CONNECT 403. Local screenshots show implementation behavior, not an original rendered comparison.

| Route | Recovered source applied | Remaining visual review |
| --- | --- | --- |
| `/` | All 23 original Imgur MP4s/posters/order preserved; 23 exact token URLs restored, replacing former placeholder destinations. Body Europa 14px/300/1.8/.04em; heading weight/color, wordmark 37px and navigation/link colors corrected. Original 960px content and 60px/20px padding retained | Original caption/row/hover composition requires baseline comparison. Preview font fallback differs from licensed fonts |
| `/ordinals` | A/B/C retained; prominent LUX/Kismet Satflow cards, official LUX still/Pink Paper, verified Kismet #100 on-chain source and exact Gamma destination | New collection prominence is requested; original work spacing still needs comparison. External artwork playback is unverified |
| `/mechanics` | Recovered Quantum/Fusion text, three images and exact Canvas/Discord destinations | Columns, image placement, emphasis and spacers unavailable |
| `/art-by-waambat` | All 25 original entries/posters/order; all 23 exact Vimeo/YouTube sources restored. Entries 18/23 remain image-only and entry 23 remains untitled. Prev/next/info/numbers/thumbnails retained; selected player's original URL retained, approved player starts after activation, changing artwork closes player | Original slideshow dimensions and control placement need baseline comparison. Player destinations/controlled frame behavior tested; live remote decoding unverified |
| `/instagram` | Original two intro statements/attributed excerpt, 32 original image sources and all eight original post URLs retained. Image-grid template replaces the full-width image stack; deferred safe embeds remain editable | Supplied source establishes a grid but does not specify exact column count/gaps or source click-target mapping. Current responsive 2/3-column grid is an implementation assumption awaiting comparison |
| `/blog-press` | All twelve exact article destinations, including original historical HTTP Adela link; both original YouTube source URLs preserved with fixed privacy players | Original module/image placement, emphasis and spacers unavailable |
| `/bio-waambat` | Full biography, all seven unedited answers and eleven source images retained; verified production typography corrected | **Not fidelity-complete:** original rows/columns, image placement, rich emphasis and spacing were not supplied. Generic reading-order rendering remains, and must not be represented as a restored original composition |
| `/contact-waambat` | Four collection steps, original main/backup Instagram/Twitter/Discord destinations; no new email form | Original heading/list geometry requires comparison |
| `/waambat` | Recovered cover heading “video art by Lindsay Scoggins” and exact public `mailto:studiowaambat@gmail.com` | Source supplies heading/email only; full cover composition unavailable |
| `/lindsay-scoggins` | “Art by waambat,” archival NFT genesis auction/Tuesday May 18th announcement, three supplied Foundation destinations | Full announcement wording/link labels/placement unavailable; “Foundation” is a functional label, not claimed recovered authored text |
| `/art` | All four original Imgur source URLs in source order, no invented work titles, two exact Foundation links. Muted loops use the existing viewport/reduced-motion playback logic | No source titles/posters or link-to-work association supplied. Functional playback labels and square media containers are implementation choices pending source layout |
| `/nfts-copy` | Canonical 308 to `/`, consistent with byte-identical original homepage and original homepage canonical. Preview privacy authorization precedes redirect; reserved against CMS shadowing | Equivalent content/canonical behavior tested; original duplication is consolidated |

Original footer destinations (Instagram, YouTube, Foundation) restored. Historical HTTP/mailto exceptions are exact recovered destinations; general links remain HTTPS/local and media/provider rules remain HTTPS/direct allowlists. User-controlled HTML/iframe markup is never accepted.

## Original font configuration

`OriginalFonts.tsx` retains the complete provided Adobe loader URL; `WAAMBAT_ORIGINAL_FONTS=1` enables it only on `waambat.com`/`www.waambat.com`, preserving upstream domain checking. Default is disabled. No font binaries were copied, no shortened/guessed kit URL was used, and the existing-domain license was not extended to preview hosts. Confirm domain/license configuration before enabling on an approved production cutover. Preview uses the declared fallback stack.

## Acceptance boundary

Lint/type checks, content validation, unit/Git tests, production build, desktop/mobile compiled twelve-route checks, fixed player activation/close/next, Instagram counts/grid, navigation/history, reduced motion, real generated MP4 playback, uploads/cancellation/stale revisions and isolated database authentication establish technical behavior. They do not establish original visual matching or real external provider availability. Keep the PR draft and production unchanged until composition and authenticated runtime acceptance pass.
