#!/usr/bin/env bash
# Usage: dribbble-save.sh <shotUrl> <out.(png|jpg|webp)>
# Opens a Dribbble shot and downloads its main (og:image) image.
set -euo pipefail
url="$1"; out="$2"
orca goto --url "$url" --json >/dev/null
orca wait --load networkidle --json >/dev/null 2>&1 || true
img=$(orca eval --expression '(document.querySelector("meta[property=\"og:image\"]")||{}).content' --json | python3 -I -c 'import sys,json; print(json.load(sys.stdin)["result"]["result"])')
img="${img%%\?*}"
curl -sSL "$img" -o "$out"
echo "$out <- $img"
