#!/bin/sh
# Encodes the cached preview loops the Ordinals page shows instantly (public/previews/), one per live piece:
# a seamless silent MP4 loop plus its first frame as a WebP poster. Names carry a hash of the file, so
# the CDN can keep them forever (netlify.toml: /previews/* is immutable); a new render gets a new name.
#   sh keel/hero/encode-ordinal-previews.sh <lux.mp4> <kismet.mp4> <gamma-frames-dir> [dest=public/previews]
# <lux.mp4> and <kismet.mp4> are the 720x720 captures from encode-captures.sh (keel/hero/src); <gamma-frames-dir>
# is the output of capture-ordinals.mjs for the Gamma inscription (720x720, see README). Prints the paths to
# put in the content (previewSrc and poster).
set -eu
LUX=${1:?lux.mp4}; KISMET=${2:?kismet.mp4}; GAMMA=${3:?gamma frames dir}
DEST=${4:-$(cd "$(dirname "$0")/../.." && pwd)/public/previews}
SIZE=${PREVIEW_SIZE:-640}; FADE=1; PY=${TRAILER_PYTHON:-python3}   # PY needs Pillow
mkdir -p "$DEST"
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT

# Real-time frames carry timestamps; resample to constant frame rate first (as encode-captures.sh does).
python3 - "$GAMMA" <<'PY'
import json, sys
d = sys.argv[1]
stamps = json.load(open(f"{d}/stamps.json"))
with open(f"{d}/list.txt", "w") as f:
    for i, (n, t) in enumerate(stamps):
        dur = ((stamps[i + 1][1] - t) if i + 1 < len(stamps) else 25) / 1000
        f.write(f"file 'f{n:05d}.jpg'\nduration {dur:.5f}\n")
    f.write(f"file 'f{stamps[-1][0]:05d}.jpg'\n")
PY
ffmpeg -v error -y -f concat -safe 0 -i "$GAMMA/list.txt" -fps_mode cfr -r 30 -c:v ffv1 -pix_fmt yuv420p "$WORK/gamma.mkv"

# loop <name> <source> <start> <length> <crf>
# The loop is [start, start+length]; its tail crossfades into its head so the last frame leads into the first.
loop() {
  name=$1; src=$2; s=$3; len=$4; crf=$5
  mid=$((len - FADE)); tail_at=$(python3 -c "print($s + $len)"); mid_at=$(python3 -c "print($s + $FADE)")
  ffmpeg -v error -y -ss "$s" -t "$FADE" -i "$src" -ss "$mid_at" -t "$mid" -i "$src" -ss "$tail_at" -t "$FADE" -i "$src" \
    -filter_complex "[0:v]scale=$SIZE:$SIZE:flags=lanczos,fps=30,setsar=1[h];[1:v]scale=$SIZE:$SIZE:flags=lanczos,fps=30,setsar=1[m];[2:v]scale=$SIZE:$SIZE:flags=lanczos,fps=30,setsar=1[t];[t][h]xfade=transition=fade:duration=$FADE:offset=0[x];[x][m]concat=n=2:v=1:a=0[o]" \
    -map "[o]" -an -c:v libx264 -profile:v main -preset veryslow -crf "$crf" -pix_fmt yuv420p -movflags +faststart "$WORK/$name.mp4"
  hash=$(shasum -a 256 "$WORK/$name.mp4" | cut -c1-10)
  cp "$WORK/$name.mp4" "$DEST/$name-$hash.mp4"
  # The poster is the loop's first frame, so playback starts without a visible change.
  ffmpeg -v error -y -i "$WORK/$name.mp4" -frames:v 1 "$WORK/$name.png"
  "$PY" - "$WORK/$name.png" "$WORK/$name.webp" <<'PY'
import sys
from PIL import Image
Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2], quality=84, method=6)
PY
  phash=$(shasum -a 256 "$WORK/$name.webp" | cut -c1-10)
  cp "$WORK/$name.webp" "$DEST/$name-$phash.webp"
  echo "$name: /previews/$name-$hash.mp4 /previews/$name-$phash.webp ($(wc -c <"$DEST/$name-$hash.mp4") + $(wc -c <"$DEST/$name-$phash.webp") bytes)"
}
# Start frames are chosen so the poster (the first frame) shows the artwork, not a flash between phases.
# Kismet and Gamma repeat about every 5 s, so a 10 s loop is two cycles.
loop lux "$LUX" 2 10 "${LUX_CRF:-29}"
loop kismet "$KISMET" 1 10 "${KISMET_CRF:-27}"
loop gamma "$WORK/gamma.mkv" 0 10 "${GAMMA_CRF:-27}"
