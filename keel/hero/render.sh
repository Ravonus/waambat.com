#!/bin/sh
# Renders both hero deliveries with the Keel trailer plugin and installs them into public/hero.
#   KEEL_TRAILER=/path/to/keel-trailer TRAILER_PYTHON=/path/to/python sh keel/hero/render.sh
# KEEL_TRAILER must contain the art-montage extensions (see README: keel-trailer-art-montage.patch).
# TRAILER_PYTHON needs numpy and Pillow. Renders take several minutes (about 5 on an M4 Max).
# Installs, per target: the main video (plays once), its ending loop (the last shot, seamlessly looping) and a poster.
set -eu
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../.." && pwd)
: "${KEEL_TRAILER:?path to a keel-trailer checkout with the art-montage extensions}"
cd "$ROOT"
node keel/hero/build-timeline.mjs --out keel/hero/timeline.json
cd "$HERE"
mkdir -p out
node "$KEEL_TRAILER/src/cli.mjs" validate timeline.json >/dev/null
# Cut-off crops, hard rectangle edges, clipped or upscaled pieces fail the render before it starts (exit 1).
node "$KEEL_TRAILER/src/cli.mjs" lint timeline.json --workspace "$HERE" > out/lint.json || { cat out/lint.json; exit 1; }
node "$KEEL_TRAILER/src/cli.mjs" render timeline.json --out out/render --workspace "$HERE" > out/render.json
cp out/render/waambat-hero-desktop.mp4 out/render/waambat-hero-mobile.mp4 \
   out/render/waambat-hero-desktop-loop.mp4 out/render/waambat-hero-mobile-loop.mp4 "$ROOT/public/hero/"
# The posters are the first frame of each video, so playback starts without a visible change.
"${TRAILER_PYTHON:-python3}" - "$HERE/out/render" "$ROOT/public/hero" <<'PY'
import sys
from PIL import Image
src, dst = sys.argv[1:3]
for name, out in (("poster-desktop.png", "waambat-hero-poster.webp"), ("poster-mobile.png", "waambat-hero-poster-mobile.webp")):
    Image.open(f"{src}/{name}").convert("RGB").save(f"{dst}/{out}", quality=86, method=6)
PY
ls -l "$ROOT/public/hero"
