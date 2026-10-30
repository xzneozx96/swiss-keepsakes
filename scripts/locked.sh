#!/bin/sh
# Runs a heavy job (tests, type check, e2e) under a shared limit, so several agent sessions on one machine cannot
# start eight of them at once. Usage: locked.sh [--name NAME] [--slots N] [--wait SECONDS] command [args...]
#   --name   which limit to share (default heavy). e2e has its own, because it runs for minutes.
#   --slots  how many jobs of that name may run at once (default 2).
#   --wait   how long to wait for a free slot before running anyway (default 600), so a stuck job never blocks everyone.
# The job runs at low priority (nice 10), so the desktop and the editor stay responsive.
# Skipped, the command just runs, when CI is set, or when a locked job started this one (SK_LOCK_HELD): a second
# flock from inside the first would wait on itself.

name=heavy
slots=2
wait=600
while [ $# -gt 0 ]; do
  case "$1" in
    --name) name=$2; shift 2 ;;
    --slots) slots=$2; shift 2 ;;
    --wait) wait=$2; shift 2 ;;
    *) break ;;
  esac
done
[ $# -gt 0 ] || { echo "usage: locked.sh [--name NAME] [--slots N] [--wait SECONDS] command [args...]" >&2; exit 2; }

if [ -n "$CI" ] || [ -n "$SK_LOCK_HELD" ] || ! command -v flock >/dev/null 2>&1; then
  exec "$@"
fi

export SK_LOCK_HELD=1
dir=${XDG_RUNTIME_DIR:-/tmp}
[ -w "$dir" ] || dir=/tmp
waited=0
told=0

while :; do
  slot=1
  while [ "$slot" -le "$slots" ]; do
    # This shell holds the lock on fd 9 while the job runs, so the job's own exit code is passed on as it is.
    # The job runs with fd 9 closed (9>&-): a worker left behind by a killed run cannot keep the slot taken.
    exec 9>"$dir/sk-$name.$slot.lock"
    if flock -n 9; then
      nice -n 10 "$@" 9>&-
      exit $?
    fi
    exec 9>&-
    slot=$((slot + 1))
  done
  if [ "$waited" -ge "$wait" ]; then
    echo "locked.sh: waited ${wait}s for a free $name slot, running anyway." >&2
    exec nice -n 10 "$@"
  fi
  if [ "$told" -eq 0 ]; then
    echo "locked.sh: $slots $name job(s) already running, waiting for a free slot (up to ${wait}s)..." >&2
    told=1
  fi
  sleep 2
  waited=$((waited + 2))
done
