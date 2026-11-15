# WAAMBAT on native Kerf

This directory contains the native TSX migration. It uses Kerf Start routes, native state/derived/watch lifetimes, the existing visual design and controls, the CMS/admin APIs and the shared Kerf media and canvas-scroll plugins. Netlify now targets this directory on Node 26 with the Netlify preset; the root Next application is retained as a tested compatibility renderer. Verify the exact production deploy revision before reporting a change live.

Use Node 26, then `npm ci --ignore-scripts`. `npm run media:restore` restores any missing immutable media bundles listed in `media/storage-manifest.json`; `npm run build` performs that check automatically. Bundles live in the public GitHub media release and verify both archive and individual file SHA256. Changed local artwork is preserved and causes a clear build error. The media files stay outside ordinary Git.

Run `npm run dev` for port 3287, `npm run typecheck`, `npm test`, `npm run check` and `npm run build`. The build uses the current Node preset. A deployment must build native dependencies on its target platform.

## Media policy

`vendor/framework-media.json` pins the exact Kerf source revision and SHA256 of each local package. The shared implementation is reviewed in https://github.com/Ravonus/kerf/pull/67. It is not a published framework release.

Raster optimization verifies decoded pixels. New full-resolution codec and frame candidates use a measured SSIMULACRA2 target of 90 and retain exact originals for Save. Existing responsive display streams remain available. Automatic preparation compares source video, native codec/container candidates and AVIF/WebP frame patches. Native wins ties. Frame output must have both a smaller payload and a lower conservative delivery byte cost, including compatibility fallbacks, manifests and a 64 KiB player allowance. Receipts keep CPU cost explicitly unmeasured. Unsupported synchronization or extra tracks retain native playback.

Run `node scripts/prepare-movies.mjs` for resumable movie preparation with three isolated workers and a single catalog merge. `node --import tsx scripts/prepare-media.mjs --videos` is the sequential alternative, without downloading again. `--only=https://i.imgur.com/JC0hAbH.mp4` limits it to one source. `--images` prepares rasters. Progress and verification are resumable in `media/source-manifest.json`; the recorded optimization policy controls reuse, and each result records its actual framework revision. No movie is encoded on a visitor's machine during ordinary playback.

`node --import tsx scripts/prepare-first-frames.mjs` creates a sharp AVIF/WebP width ladder for every acquired movie and GIF, using the shared first-frame provider (preview target 80). Players wait for that still and reuse its chosen URL as their poster. `node scripts/prepare-streams.mjs` uses the shared FFmpeg provider for packet-preserving HLS where a responsive stream is absent. Playback loads a short buffer and stops loading on pause; offscreen animations return to their still. There are no enlarged blur thumbnails or blurred Save backdrops.

`media/recovered-inscriptions.json` records public inscription-body recovery; the eggplant hash matches the pre-existing hero source record. The archived mechanics clip is likewise checked against its historical source hash. Interactive inscriptions retain their live documents. `node scripts/verify-media.mjs` verifies retained originals, Save mappings, first-frame coverage and stream files. After a production build, `node scripts/verify-media-http.mjs http://localhost:3288` checks the server's file responses.

`OptimizedVideo` keeps the site's existing video placement, controls and adaptive HLS behavior. It uses Kerf's frame player only for a selected frame record and falls back to the native original on a browser playback failure. Trailers requiring native controls retain the native video path. The compact playback catalog is separate from the larger save catalog, which loads only on right-click. The save dialog prepares just that file, supports cancellation, then offers the exact original.

## Current verification and release limits

The local contact clip was evaluated through the shared optimizer: 1,282,990-byte original; 1,283,009-byte remux; candidate AV1 and H.264 encodes were larger. Perceptual frame output exceeded the whole original's size after 0.1 seconds, so it was stopped and rejected. The original remains selected. A separate transparent fixture demonstrated a real frame-delivery win and working browser playback/pause. Temporary fixture routes and assets are removed after verification.

The source inventory has 210 acquired assets: 96 movies, four GIFs and 110 static images. Preparation is complete, with 100 sharp first-frame records and 22 additional verified native HLS streams. Original-file checks pass for every acquired asset. The automatic movie selection retained 94 native originals and chose two smaller native container copies; larger image-frame representations were rejected. Sixteen upstream videos remain unavailable: twelve restricted Vimeo sources, three YouTube sources requiring sign-in/age confirmation, and one deleted Imgur movie with no matching archive. They retain their original links/player behavior.

Before a production switch: configure and validate the Netlify target/auth/backend environment, and pass the remaining framework release gates. The all-stack comparison completed on revision `046e19d5`; the icon compiler resolver no longer re-enters its own pending import. The actual history/chart and host provenance are committed in Kerf. The global runtime size budget still fails on the unchanged base (13.59 KiB Brotli against 13.37 KiB); the limit was not raised. No new PageSpeed score is claimed.

## Branding

The original artist sigil is retained byte-for-byte in `public/brand/waambat-sigil-original.svg`, with inscription provenance in `media/sigil-source.json`. Header and home-hero branding keep the original WAAMBAT wordmark with the sigil alongside it. `node scripts/prepare-brand.mjs` regenerates the SVG/ICO favicon and Apple touch icon from that source. The existing hero logo override remains editable in admin.

The browser-only media entry selects a display-appropriate first HLS level on ordinary connections and retains low startup levels on slow links. After the visible poster settles, one first playback chunk per artwork can warm through the shared queue (512 KiB/minute; 128 KiB/minute on slow links; no speculation in data-saver mode). Route changes cancel it. The header uses Veneer's one shared nav indicator, including wrapped rows.

Auth uses GitHub, Google and credentials rather than Auth.js email providers. Its unused optional Nodemailer peer is narrowly overridden to the patched contact-mail dependency, so clean npm installs preserve the tested transport.

## Artist settings and current cards

Admin → Search, sharing & analytics edits the public GA4 ID, its enable switch,
Search Console token, home title, descriptions, share image, portrait and sigil.
Save → Preview → Publish applies the settings without a build. The shared agent
contract is in `../AGENTS.md`. Tracking sends only public page views on waamb.at;
GA4 Enhanced measurement stays off. A blank ID or disabled switch stops tracking.
Cards at `/social-card.jpg` read published content per request and revalidate with
an ETag; post-deployment publications no longer depend on the seed manifest.

`node scripts/vendor-framework.mjs /path/to/kerf` regenerates the hash-pinned
reviewed packages. As with Kerf's release staging, the vendored Core manifest
omits the unpublished Windows ARM optional addon; the bundled matching WASM
compiler remains available there. The source revision and manifest adjustment
are recorded in `vendor/framework-media.json`. Do not invent a lock entry for
a package that does not exist. Verify `npm ci --ignore-scripts` in a clean copy.
