#!/usr/bin/env bash
# Usage: dribbble-search.sh "<query>" <grid.jpg>
# Opens a Dribbble search in the active Orca tab, saves a viewport screenshot of the grid, prints numbered shot links.
set -euo pipefail
q="$1"; out="$2"
slug=$(python3 -I -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1].replace(" ","-")))' "$q")
orca goto --url "https://dribbble.com/search/$slug" --json >/dev/null
orca wait --load networkidle --json >/dev/null 2>&1 || true
sleep 3
orca screenshot --format jpeg --json | python3 -I -c 'import sys,json,base64; d=json.load(sys.stdin); open(sys.argv[1],"wb").write(base64.b64decode(d["result"]["data"]))' "$out"
orca eval --expression 'JSON.stringify([...document.querySelectorAll("li.shot-thumbnail")].slice(0,16).map(li=>(li.querySelector("a.shot-thumbnail-link")||{}).href))' --json \
 | python3 -I -c 'import sys,json; d=json.load(sys.stdin); [print(i, u) for i,u in enumerate(json.loads(d["result"]["result"]))]'
