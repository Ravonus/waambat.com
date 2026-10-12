#!/bin/sh
# Turns the two Ordinals captures into the 720x720 sources the timeline reads (src/lux.mp4, src/kismet.mp4).
#   sh keel/hero/encode-captures.sh <lux-frames-dir> <kismet-web.mkv> [dest=keel/hero/src]
# <lux-frames-dir> is the output of capture-ordinals.mjs; <kismet-web.mkv> is the Keel web capture of
# captures/kismet.json (trailer-capture; see README).
set -eu
LUX_DIR=${1:?lux frames dir}; KISMET=${2:?kismet web.mkv}; DEST=${3:-$(dirname "$0")/src}
mkdir -p "$DEST"
python3 - "$LUX_DIR" <<'PY'
import json, sys
d = sys.argv[1]
stamps = json.load(open(f"{d}/stamps.json"))
with open(f"{d}/list.txt", "w") as f:
    for i, (n, t) in enumerate(stamps):
        dur = ((stamps[i + 1][1] - t) if i + 1 < len(stamps) else 25) / 1000
        f.write(f"file 'f{n:05d}.jpg'\nduration {dur:.5f}\n")
    f.write(f"file 'f{stamps[-1][0]:05d}.jpg'\n")
PY
# Real-time frames carry timestamps; resample them to constant frame rate losslessly first.
ffmpeg -v error -y -f concat -safe 0 -i "$LUX_DIR/list.txt" -fps_mode cfr -r 30 -c:v ffv1 -pix_fmt yuv420p "$LUX_DIR/lux.mkv"
ffmpeg -v error -y -i "$LUX_DIR/lux.mkv" -vf scale=720:720:flags=lanczos -c:v libx264 -crf 8 -preset medium -pix_fmt yuv420p -r 30 "$DEST/lux.mp4"
ffmpeg -v error -y -i "$KISMET" -vf scale=720:720:flags=lanczos -c:v libx264 -crf 8 -preset medium -pix_fmt yuv420p -r 30 "$DEST/kismet.mp4"
echo "wrote $DEST/lux.mp4 and $DEST/kismet.mp4"
