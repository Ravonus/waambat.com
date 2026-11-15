#!/bin/zsh
# Re-runs every round-3 browser check against http://localhost:3287 and keeps its output.
DIR="${0:A:h}"
(cd /Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/waambat && git diff -- kerf/src kerf/test src | shasum | cut -c1-12) > "$DIR/fingerprint.txt"
cd "$DIR"
for s in measure2 ink burst calm3 menuplay top mech mechm dead leak-and-root play; do
  echo "== $s" ; node $s.mjs $([ $s = play ] && echo art-by-waambat) > $s.out.txt 2>&1; echo "exit $?"
done
