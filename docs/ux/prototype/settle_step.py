"""Coordinator helper: append a worker report's PROPOSED decisions to decisions.tsv and mark its todo step [~]."""
import re, sys
root = "/home/ross-geller/Projects/minastik/swiss-keepsakes/docs/ux"
step = sys.argv[1]
report = open(f"{root}/prototype/reports/{step}.md").read()
rows = [l for l in report.splitlines() if l.startswith("2026-") and l.count("\t") >= 5]
existing = open(f"{root}/decisions.tsv").read()
new = [r for r in rows if r not in existing]
with open(f"{root}/decisions.tsv", "a") as f:
    if not existing.endswith("\n"): f.write("\n")
    for r in new: f.write(r.rstrip() + "\n")
todo = open(f"{root}/prototype/todo.md").read()
pat = re.compile(r"^- \[ \] " + re.escape(step) + r" (.*)$", re.M)
todo2 = pat.sub(lambda m: f"- [~] {step} {m.group(1)} · built in the parallel run, report: [reports/{step}.md](reports/{step}.md)", todo, count=1)
open(f"{root}/prototype/todo.md", "w").write(todo2)
print(step, "decisions appended:", len(new), "todo updated:", todo != todo2)
