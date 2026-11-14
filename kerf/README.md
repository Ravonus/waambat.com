# WAAMBAT on native Kerf

This directory is the native TSX migration, on branch `migration/kerf`. It uses Kerf Start routes, native state/derived/watch lifetimes, the existing visual design and controls, the CMS/admin APIs and the shared Kerf media and canvas-scroll plugins. Production at waamb.at still uses the root Next application; this migration is not deployed.

Use Node 26, then `npm ci --ignore-scripts`. Run `npm run dev` for port 3287, `npm run typecheck`, `npm test`, `npm run check` and `npm run build`. The build uses the current Node preset. A deployment must build native dependencies on its target platform.

## Media policy

`vendor/framework-media.json` pins the exact Kerf source revision and SHA256 of each local package. The shared implementation is reviewed in https://github.com/Ravonus/kerf/pull/67. It is not a published framework release.

Raster optimization verifies decoded pixels. Video playback uses a measured perceptual target of SSIMULACRA2 90 and retains exact originals for Save. Automatic preparation compares source video, native codec/container candidates and AVIF/WebP frame patches. Native wins ties. Frame output must have both a smaller payload and a lower conservative delivery byte cost, including compatibility fallbacks, manifests and a 64 KiB player allowance. Receipts keep CPU cost explicitly unmeasured. Unsupported synchronization or extra tracks retain native playback.

Run `node --import tsx scripts/prepare-media.mjs --videos` to prepare already-acquired movies without downloading again. `--only=https://i.imgur.com/JC0hAbH.mp4` limits it to one source. `--images` prepares rasters. Progress and verification are resumable in `media/source-manifest.json`; a different pinned framework revision invalidates old video decisions. No movie is encoded on a visitor's machine during ordinary playback.

`OptimizedVideo` keeps the site's existing video placement, controls and adaptive HLS behavior. It uses Kerf's frame player only for a selected frame record and falls back to the native original on a browser playback failure. Trailers requiring native controls retain the native video path. The compact playback catalog is separate from the larger save catalog, which loads only on right-click. The save dialog prepares just that file, supports cancellation, then offers the exact original.

## Current verification and release limits

The local contact clip was evaluated through the shared optimizer: 1,282,990-byte original; 1,283,009-byte remux; candidate AV1 and H.264 encodes were larger. Perceptual frame output exceeded the whole original's size after 0.1 seconds, so it was stopped and rejected. The original remains selected. A separate transparent fixture demonstrated a real frame-delivery win and working browser playback/pause. Temporary fixture routes and assets are removed after verification.

The source inventory has 204 locally acquired assets and 19 unavailable sources (provider restrictions or invalid URLs). Raster regeneration is complete; the full movie inventory has not yet been regenerated under this policy. Unavailable provider sources retain their existing external-player behavior.

Before a production switch: complete movie regeneration, resolve the oversized-asset transport (some originals exceed GitHub's ordinary file limit), configure and validate the Netlify target/auth/backend environment, and pass the remaining framework release gates. The all-stack comparison currently stalls compiling `kerf-plain/feed/main.tsx`; the global runtime size budget also fails on the unchanged base. No replacement benchmark results or new PageSpeed score are claimed.
