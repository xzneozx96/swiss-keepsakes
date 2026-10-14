#!/usr/bin/env bash
# Usage: pshot.sh <pageId> <url|-> <out.jpg> [scrollY]
# Screenshot an Orca browser tab (optionally navigating first and scrolling to scrollY). Retries once on a failed capture.
set -euo pipefail
page="$1"; url="$2"; out="$3"; y="${4:-}"
if [ "$url" != "-" ]; then orca goto --page "$page" --url "$url" --json >/dev/null; sleep 5; fi
if [ -n "$y" ]; then orca eval --page "$page" --expression "window.scrollTo(0,$y); 'ok'" --json >/dev/null; sleep 2; fi
for k in 1 2 3; do
  if orca screenshot --page "$page" --format jpeg --json | python3 -I -c 'import sys,json,base64; d=json.load(sys.stdin); open(sys.argv[1],"wb").write(base64.b64decode(d["result"]["data"]))' "$out" 2>/dev/null; then echo "$out"; exit 0; fi
  sleep 2
done
echo "capture failed: $out" >&2; exit 1
