# WAAMBAT hero: Keel trailer project

The home banner is a 24 second silent loop made from WAAMBAT's own works, rendered by the Keel trailer
plugin (`@keel/trailer`, timeline-v1). It is a montage, not a recording of the site: every layer is a real
video from her portfolio, cropped and placed but never rotated or restyled, layered on black the way her
collages are, and bridged by datamosh, pixel-mosaic and chromatic-displacement transitions. The last shot
hands over to the first, so the loop has no visible join.

The wordmark is **not** baked into the video. The site draws it live (amboy-inline, her logo pink) in the
quiet left column of the desktop frame and the top band of the mobile frame, so it stays the exact font and
editable. The artwork stage is kept clear of it.

| Output (in `public/hero/`)                                    | Size                              | Notes                                               |
| ------------------------------------------------------------- | --------------------------------- | --------------------------------------------------- |
| `waambat-hero-desktop.mp4`                                    | 1280×720, 24 fps, H.264, no audio | wordmark column left, artwork stage right           |
| `waambat-hero-mobile.mp4`                                     | 720×900, 24 fps, H.264, no audio  | wordmark band on top, artwork stage below           |
| `waambat-hero-poster.webp`, `waambat-hero-poster-mobile.webp` | first frame of each               | shown before play, for reduced motion and Save-Data |

Each video is kept under 4 MB so the studio's uploader (4 MB cap) can replace it without a developer.

## What is in the montage

Nine shots of 3 s (6 beats at 120 bpm), the last 1.5 s, over a black ground. Transition into each shot:

| Shot   | Hero work                             | Transition in                                        |
| ------ | ------------------------------------- | ---------------------------------------------------- |
| goat   | GOAT, over the art-archive mass video | (opens the loop)                                     |
| lux    | LUX                                   | chromatic displacement                               |
| faces  | art-archive selfie video              | datamosh                                             |
| hard   | Hard Launch                           | pixel mosaic                                         |
| kismet | Kismet Twist                          | chromatic displacement                               |
| animal | Animal Spirits                        | datamosh                                             |
| dense  | blog + press face collage             | pixel mosaic                                         |
| lore   | Joys of Lore                          | chromatic displacement                               |
| tail   | Swap Exchange                         | datamosh, then the loop seam (datamosh) back to goat |

Satellite layers in each shot (screen/lighten/add blends, small, drifting) bring in the other works. All 34
sources are used: the 22 NFT paintings that still load, LUX, Kismet Twist, the art-archive videos, the bio
animation, and the contact, mechanics and press videos (the three with embedded text only through
text-free crops). `sources.json` lists each one with its origin, the page it appears on, and the sha256 of
the file the committed timeline was rendered from.

Not included, and why: _Autocorrection_ and the first and third mechanics videos (their Imgur files no
longer exist; the site itself shows them as unavailable), and the provider-hosted archive videos (not
downloadable).

## Files

| File                             | Purpose                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| `build-timeline.mjs`             | The composition. Generates `timeline.json` (deterministic). `--scale`/`--fps` make quick previews. |
| `timeline.json`                  | The committed timeline-v1 file the shipped videos were rendered from.                              |
| `sources.json`                   | Provenance, dimensions, sha256 of every source video.                                              |
| `fetch-sources.mjs`              | Downloads the 32 site videos into `src/` and checks the hashes.                                    |
| `capture-ordinals.mjs`           | Real-time GPU capture of LUX (see below).                                                          |
| `captures/kismet.json`           | Keel web-capture request for Kismet Twist.                                                         |
| `encode-captures.sh`             | Turns both captures into `src/lux.mp4` and `src/kismet.mp4`.                                       |
| `render.sh`                      | Validates and renders both targets, installs videos and posters into `public/hero/`.               |
| `keel-trailer-art-montage.patch` | The Keel trailer extensions the render needs (below).                                              |

`src/`, `captures/*/`, `out/` and `work/` are git-ignored: they are large and reproducible.

## Keel trailer extensions

The montage needs features the plugin did not have: layered stage shots with blend modes, masks, black point
and per-target rects; bloom, radial chroma and pulse post effects; block-motion datamosh, stepped mosaic and
chromatic displacement transitions; a seamless loop seam; and silent H.264 delivery sized by video alone.
They are generic-profile additions (the reference _crucible-v3_ behaviour is unchanged) with their own tests
and a README section ("Art montages").

They live on branch `waambat-hero-materials` of `keel-web3/keel-trailer` (base `63a55a7`, two commits, head
`00d3d09`; no pull request is open yet). `keel-trailer-art-montage.patch` is the same change without the
regenerated JSON schemas, for a checkout that does not have the branch:

```bash
git -C /path/to/keel-trailer checkout -b waambat-hero-materials 63a55a7
git -C /path/to/keel-trailer am /path/to/waambat.com/keel/hero/keel-trailer-art-montage.patch
(cd /path/to/keel-trailer && pnpm schema)           # only needed to refresh the MCP schemas
```

The render does not read the generated schemas; they only matter for MCP clients.

## Re-rendering

```bash
node keel/hero/fetch-sources.mjs                    # 32 site videos into keel/hero/src
node keel/hero/capture-ordinals.mjs \
  "https://ordinals.com/content/ce994e920942542babe215b0837704be9c73e9d08cdb8e6a818cf7767dbc7dcci2" \
  keel/hero/captures/lux 960 960 18000 28000        # LUX, real time on a GPU
# Kismet Twist: run the Keel `trailer-capture` tool with keel/hero/captures/kismet.json
sh keel/hero/encode-captures.sh keel/hero/captures/lux keel/hero/captures/kismet/web.mkv
KEEL_TRAILER=/path/to/keel-trailer TRAILER_PYTHON=/path/to/python-with-numpy-pillow \
  sh keel/hero/render.sh
```

Why LUX is captured in real time: Keel's deterministic web adapter pauses the page clock, and LUX never
becomes ready under a paused clock; software GL is too slow to capture a frame per tick. The script records
what a visitor with a GPU sees, with timestamps, and `encode-captures.sh` resamples to constant frame rate.
Kismet Twist is deterministic and uses the normal adapter. A recapture of either will differ in detail from
the committed render, because both depend on the browser, GPU and the live inscription.

Rendering takes about five minutes on an M4 Max and reads each source a frame at a time. After rendering,
`out/render/verification.json` reports size, dimensions, loop and frame alignment; check it says
`"passed": true` and that both files are under their `maxBytes` before committing them.

## Changing the design

- **Different order, works or placement:** edit the `shots` table in `build-timeline.mjs`, then re-render.
  Placements are fractions of the artwork stage, so the desktop and mobile frames stay compositions of the
  same shots.
- **Swap the video without code:** upload a new MP4 and poster in the studio (the "Hero banner" section on Home).
  The hero media, posters, logo image, title and aspect ratios are ordinary content fields. The wordmark
  size, and motion (full, calm, off), are in the theme panel.
- **Tune the montage's feel:** `quiet` and `loud` in `build-timeline.mjs` set bloom, chroma and pulse; each
  transition has its own `beats`, `strength` and `blockSize`.
