#!/bin/zsh
# Round 3b regression re-run. Screens go to shots-r2/, results to *-r2.json.
cd "$(dirname "$0")"
export SHOTS=shots-r2 SUFFIX=-r2 NOW=now
for s in bursts menu a11y video pages; do echo "== $s $(date +%T) $(uptime | sed 's/.*load/load/')"; node $s.mjs 2>&1 | tail -25; done
node sheet.mjs
echo "== done $(date +%T)"
