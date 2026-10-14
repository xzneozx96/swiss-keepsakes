import json, subprocess
root = "/home/ross-geller/Projects/minastik/swiss-keepsakes"
out = f"{root}/docs/ux/prototype/screens/phase1-review"
common = (f"Swiss Keepsakes prototype, step 1.19 Review gallery. Repo root: {root} (no git). FIRST read {root}/docs/ux/prototype/worker-brief.md "
  "(conventions, dev server port rules, Playwright, report). This step changes NO product code under front-end/src. Owner wants screenshots of every screen built in this session "
  "so they can approve or reject each todo item in one HTML page.\nItem list: docs/ux/prototype/screens/phase1-review/items.json (item id, title, report). "
  "Read the reports for the items you capture so you know which states each item added.\n")
capture_rules = ("Capture rules: current final state of the app; start from the prototype bar's Reset and drive the real flow (outline §1 demo path) rather than injecting data, except where a report names a prototype control for a state. "
  "PNG, full-page where the screen scrolls, otherwise viewport; guest frame at 375px wide; EN for every state, plus DE for one representative state per screen. "
  f"Save images in {out}/img/ named <item>-<nn>-<screen>-<state>-<lang>-<width>.png (e.g. 1.5d-01-c04-none-selected-en-375.png). "
  "Several items change the same screen (e.g. cart 1.5 to 1.5f): attribute each shot to the item whose feature it shows best; every listed item needs at least one shot. "
  "Write a manifest JSON array to {manifest}: [{{\"item\":\"1.5d\",\"file\":\"img/<name>.png\",\"caption\":\"one line naming screen ID and state\",\"lang\":\"en\",\"width\":375}}], in review order. "
  "If a screen looks broken, capture it anyway and add \"issue\":\"...\" to that entry. Kill your dev server at the end.\n")
tasks = [
 {"key":"1.19a","title":"1.19a Capture guest screens","port":5201,
  "body": "Items: 1.4 (C03 gift detail incl. choices sheet, gallery), 1.4b (fly-to-cart mid-flight frame, badge, toast), 1.5, 1.5b (remove confirm), 1.5c, 1.5d (none selected, some selected, nothing-selected reason), 1.5e (breakdown sheet, info alert, scrolled to end), 1.5f (option/engraving rows), 1.6 (sign-in sheet: options, email code, wrong code, attempts lock; Account signed out/in; Mail panel), 1.7 and 1.7b (C06 review, stock error), 1.8 (C07, trip profile answered/skipped), 1.12 (C14 list, empty), 1.13 (C15 key states: payment due with auto-cancel warning, changed place note, being prepared, handed over with balance, completed with review button, declined, cancelled overdue with request again, payment processing, received after cancellation), 1.14 (C12 provider choices, processing, failed + retry), 1.16 (C18 review sheet, already reviewed, the review on C03). All guest at 375px.\n"
  + capture_rules.format(manifest=f"{out}/manifest-guest.json")},
 {"key":"1.19b","title":"1.19b Capture merchant and partner screens","port":5202,
  "body": "Items: 1.9 (M02 Today with tasks, empty), 1.10 (M03 tabs, empty tab, 1024 table), 1.10b (pickup-ticket cards incl. the M02-matching surface, a few tabs), 1.11 (M04 decision block, accept sheet with the confirmation sentence, change place sheet with note, decline reason + confirm dialog, stock short on the print race, log/commission/policy sections), 1.15 (fulfilment card: ready, handed over with Complete locked, combined button; M08 record payment sheet, duplicate warning, above-balance block; completed with commission recorded), 1.17 (P02 partner report day/week/month, empty period), 1.18 (no screens of its own: capture one shot of the prototype bar showing role switch + Mail panel with staff mail as the 'flow check' illustration). Merchant and partner at 375px AND 1024px. To have Anna's two requests for M02/M04, first send them as the guest through C04 to C06 (tick lines or Select all), then switch role.\n"
  + capture_rules.format(manifest=f"{out}/manifest-merchant.json")},
 {"key":"1.19c","title":"1.19c Build the review page","port":None,
  "body": (f"Target: {out}/build-review.mjs (node script, no dependencies) and the generated {out}/index.html. Change: write the script, which reads items.json, manifest-guest.json and manifest-merchant.json (whichever exist; workers 1.19a and 1.19b write them in parallel, so build and test with a small sample manifest of your own, then delete the sample) and writes one self-contained index.html (inline CSS/JS, relative img paths, works opened from disk via file://, no network). "
   "Page: title 'Phase 1 review'; a sticky summary bar (counts approved / not approved / not reviewed, filter buttons, 'Download review' and 'Copy as text'); one section per item in items.json order: item id + title, link to its report (relative path from items.json; show 'no report' if the file is missing at build time), its screenshots as a responsive grid of thumbnails with captions, lang and width chips, 'issue' entries highlighted; click a thumbnail opens a full-size viewer with prev/next and Esc; then the verdict control: two big toggle buttons 'Approved' and 'Not approved', and a comment textarea (required when Not approved, shows a hint until filled). "
   "State is saved to localStorage (wrapped in try/catch) under a key including the build time, so reloading keeps verdicts; a 'Reset verdicts' link with confirm. 'Download review' saves phase1-review.json: {reviewedAt, items:[{item,title,verdict:'approved'|'not_approved'|null,comment}]}; 'Copy as text' copies the same as readable lines. Items with no screenshots show a note. "
   "Visual: clean, calm, matches the prototype's feel (warm off-white background, white cards rounded-3xl with a soft shadow, Inter or system font, red accent sparingly); keyboard accessible; works from 1024px up and is usable on a phone. "
   f"Ownership: only files in {out} except img/ and the manifests. Acceptance: run node build-review.mjs, open index.html with Playwright from file://, mark one item approved and one not approved with a comment, reload (state kept), download JSON (check content); screenshots of the page in {root}/docs/ux/prototype/screens/1.19/; report docs/ux/prototype/reports/1.19c.md with the command to rebuild.")},
]
ids = {}
for t in tasks:
    port = f" Dev server port {t['port']} (never 5173)." if t["port"] else ""
    spec = common + t["body"] + port + f" Report: docs/ux/prototype/reports/{t['key']}.md."
    r = subprocess.run(["orca","orchestration","task-create","--spec",spec,"--task-title",t["title"],"--display-name",t["title"],"--deps","[]","--json"],capture_output=True,text=True)
    tid = json.loads(r.stdout)["result"]; tid = tid.get("task",tid)["id"]; ids[t["key"]] = tid
    s = subprocess.run(["orca","orchestration","worker-start","--task",tid,"--worktree","current","--agent","claude","--model","opus","--json"],capture_output=True,text=True)
    d = json.loads(s.stdout); res = d.get("result",d)
    print(t["key"], tid, s.returncode, res.get("stage"), res.get("launch",{}).get("effective"))
