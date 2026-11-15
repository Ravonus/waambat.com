# Visible starts for the archive

Four acquired archive videos begin with black frames: Hans Zimmer, Lucy's Closet,
Everything, and Poison Progression. Their exact frame-zero previews faithfully
reproduced that black opening. A separate sizing error gave Sus Singularity's
portrait replacement its old landscape thumbnail ratio, leaving large empty sides.

The exact frame-zero assets remain. Media preparation now detects a blank opening,
scans a bounded first 20 seconds, and chooses a readable source frame. Kerf's shared
`createFirstFrameBuild({at})` encodes responsive, exact-pixel preview images and
records the source timestamp. Playback begins normally behind that image and is
revealed only after a presented frame reaches the recorded time and resolution.
Later black scenes remain part of the artwork. Original movies and Save mappings
are unchanged; visitors do no pixel analysis or encoding.

Run `npm run media:starts` in `kerf/` to prepare existing records. The full
`prepare-first-frames.mjs` path also applies this policy to new legacy-catalog movies.
Missing generated preview files are regenerated; unchanged records are not rewritten.
The four responsive ladders are committed under `public/video-previews/` and served
with immutable caching. They are separate from the Ordinals preview files.

Source migration version 3 repairs only Sus's known legacy ratio and preserves
version-2 thumbnail toggles, archive choices and artist-supplied replacement ratios.
All 25 entries remain; the 13 thumbnail-only captions are preserved.

Verification: 119 site contracts passed, zero type/source errors (five existing
source warnings), a successful production build and eight routes audited at phone
and desktop widths with zero audit errors or warnings. Four focused Kerf tests
passed, including actual later-frame decoded-pixel identity and frame-zero cache
isolation. The dependency lock's dry-run install passed. Browser inspection observed
Everything's loaded preview while video opacity stayed zero at 7.0395 seconds,
then live 1280 × 720 playback at opacity one after the threshold. Both first-row
portrait tiles measured 575 × 1021 in the desktop preview.

These are local verification results; this change has not been deployed.
