#!/usr/bin/env bash
# 2.15-r2 runner: every step driver and the joined-up 2.15 drivers, sequentially.
S="/tmp/claude-1000/-home-ross-geller-Projects-minastik-swiss-keepsakes/2f1e1909-bd7e-43ce-a852-f01cad8fcc20/scratchpad"
P="/home/ross-geller/Projects/minastik/swiss-keepsakes/docs/ux/prototype"
R="$P/reports"; L="$R/2.15-r2-logs"; SH="$P/screens/2.15-r2"
mkdir -p "$L" "$SH/steps" "$SH/joined"
cp "$R"/*.mjs "$S/drv/"
cd "$S/drv" || exit 1
run() { local name=$1; shift; echo "== $name start $(date +%T)"; timeout 1200 "$@" > "$L/$name.out" 2>&1; local code=$?; echo "== $name exit $code $(date +%T) | $(grep -hE 'passed|SUMMARY|RESULT' "$L/$name.out" | tail -1) | FAIL lines: $(grep -c '^FAIL' "$L/$name.out")"; }
ONLY="${ONLY:-all}"
if [[ $ONLY == all || $ONLY == steps ]]; then
  for d in 2.1 2.2 2.3 2.3-map 2.4; do run "$d-drive" node "$d-drive.mjs" "$SH/steps/$d"; done
  rm -rf "$S/root"
  for d in 2.5 2.6 2.7 2.8 2.9; do run "$d-drive" node "$d-drive.mjs" "$S/root"; done
  mkdir -p "$SH/steps" && cp -r "$S/root/docs/ux/prototype/screens/"* "$SH/steps/" 2>/dev/null
  for d in 2.10 2.11 2.12 2.13 2.14; do run "$d-drive" env SCREENS="$SH/steps" node "$d-drive.mjs"; done
fi
if [[ $ONLY == all || $ONLY == joined ]]; then
  for part in guest merchant checks; do for lang in en de; do run "2.15-$part-$lang" env OUT="$SH/joined" node "2.15-$part.mjs" "$lang"; done; done
fi
echo "== ALL DONE $(date +%T)"
