import json, subprocess, sys
root = "/home/ross-geller/Projects/minastik/swiss-keepsakes"
tasks = json.load(open(f"{root}/docs/ux/prototype/orchestration-tasks.json"))
tasks.append({"key": "1.18", "title": "1.18 Flow check", "deps": [t["key"] for t in tasks], "port": 5194,
  "body": "Target: the whole flow-1 prototype in front-end/. Change: verification only, plus small fixes. Run outline §8 coverage: S2 and S4 in full, the flow-1 parts of S1, S3 and S5, every side path in outline §1, in EN and DE at 375px (merchant also 1024px), keyboard and error states. Read every docs/ux/prototype/reports/*.md first. Fix only small integration defects (broken links between steps, missing i18n keys, overflow); list anything larger as an open issue instead of rewriting a screen. Ownership: integration fixes anywhere, each listed in the report. Observable acceptance: a checklist table in the report with pass/fail per scenario step and side path, with screenshot paths in docs/ux/prototype/screens/1.18/; npx tsc --noEmit clean for the whole tree; npx eslint (no --fix) on src reports no errors. Port 5194. Report: docs/ux/prototype/reports/1.18.md."})
ids = {}
for t in tasks:
    spec = (f"Swiss Keepsakes prototype, step {t['key']}. Repo root: {root} (no git). "
            f"FIRST read {root}/docs/ux/prototype/worker-brief.md and follow it exactly.\n\n{t['body']}")
    cmd = ["orca", "orchestration", "task-create", "--spec", spec, "--task-title", t["title"],
           "--display-name", t["title"], "--deps", json.dumps([ids[d] for d in t["deps"]]), "--json"]
    out = subprocess.run(cmd, capture_output=True, text=True)
    if out.returncode != 0:
        print("FAILED", t["key"], out.stdout, out.stderr); sys.exit(1)
    r = json.loads(out.stdout)["result"]
    task = r.get("task", r)
    ids[t["key"]] = task["id"]
    print(t["key"], task["id"])
json.dump(ids, open(f"{root}/docs/ux/prototype/orchestration-task-ids.json", "w"), indent=1)
