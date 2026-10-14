#!/usr/bin/env bash
# Usage: pinterest-search.sh "<query>" <outdir> <pageId> [scrolls=4]
# Runs a Pinterest search in the given Orca tab (must be logged in), scrolls, and downloads each pin's 736px image.
# Writes <outdir>/pins.tsv with: file, pin URL, alt text.
set -euo pipefail
q="$1"; out="$2"; page="$3"; n="${4:-4}"
mkdir -p "$out"
enc=$(python3 -I -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1]))' "$q")
orca goto --page "$page" --url "https://www.pinterest.com/search/pins/?q=$enc" --json >/dev/null
sleep 4
js='JSON.stringify([...document.querySelectorAll("div[data-test-id=pin] , div[data-grid-item]")].map(d=>{const a=d.querySelector("a[href*=\"/pin/\"]");const i=d.querySelector("img");return a&&i?[a.href.split("?")[0],(i.currentSrc||i.src).replace(/\/(236x|474x|564x)\//,"/736x/"),(i.alt||"").replace(/\s+/g," ").slice(0,140)]:null}).filter(Boolean))'
: > "$out/raw.json"
for k in $(seq 1 "$n"); do
  orca eval --page "$page" --expression "$js" --json | python3 -I -c 'import sys,json; print(json.load(sys.stdin)["result"]["result"])' >> "$out/raw.json"
  orca scroll --page "$page" --direction down --amount 2500 --json >/dev/null; sleep 3
done
python3 -I - "$out" <<'PY'
import json, sys, urllib.request, hashlib, os
out = sys.argv[1]; seen = {}
for line in open(os.path.join(out, "raw.json")):
    for pin, img, alt in json.loads(line):
        seen.setdefault(pin, (img, alt))
rows = []
for pin, (img, alt) in seen.items():
    if "pinimg.com" not in img: continue
    pid = pin.rstrip("/").split("/")[-1]
    f = os.path.join(out, f"{pid}.jpg")
    if not os.path.exists(f):
        try:
            req = urllib.request.Request(img, headers={"User-Agent": "Mozilla/5.0"})
            open(f, "wb").write(urllib.request.urlopen(req, timeout=20).read())
        except Exception as e:
            continue
    rows.append(f"{pid}.jpg\t{pin}\t{alt}")
open(os.path.join(out, "pins.tsv"), "a").write("\n".join(rows) + "\n")
print(len(rows), "pins")
PY
