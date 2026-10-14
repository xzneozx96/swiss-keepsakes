#!/usr/bin/env bash
# Usage: shot.sh <url> <out.jpg> [scrollPx]
# Opens url in the active Orca browser tab, waits, optionally scrolls, saves a JPEG viewport screenshot.
set -euo pipefail
url="$1"; out="$2"; scroll="${3:-0}"
orca goto --url "$url" --json >/dev/null
orca wait --load networkidle --json >/dev/null 2>&1 || true
sleep 3
if [ "$scroll" != "0" ]; then orca scroll --direction down --amount "$scroll" --json >/dev/null; sleep 2; fi
orca screenshot --format jpeg --json | python3 -I -c 'import sys,json,base64; d=json.load(sys.stdin); open(sys.argv[1],"wb").write(base64.b64decode(d["result"]["data"]))' "$out"
echo "$out"
