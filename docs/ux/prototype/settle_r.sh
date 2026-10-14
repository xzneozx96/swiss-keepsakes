#!/usr/bin/env bash
# usage: settle_r.sh <step> <dispatch_id>  — release worker, append decisions, mark follow-up [~]
set -u
cd "/home/ross-geller/Projects/minastik/swiss-keepsakes"
orca orchestration worker-release --dispatch "$2" --json | grep -o '"state": "[a-z_]*"\|"reason": "[a-z_]*"' | tr '\n' ' '; echo
python3 -I docs/ux/prototype/settle_step.py "$1" >/dev/null
sed -i "s|^- \[ \] $1 \(.*\)$|- [~] $1 \1 · report: [reports/$1.md](reports/$1.md)|" docs/ux/prototype/todo.md
grep -n "^- \[.\] $1 " docs/ux/prototype/todo.md | cut -c1-70
