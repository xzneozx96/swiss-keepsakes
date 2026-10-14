#!/usr/bin/env bash
# Coordinator helper: optionally ack a delivery, then wait for worker_done / question / escalation.
ack=()
[ -n "${1:-}" ] && ack=(--ack "$1")
orca orchestration check "${ack[@]}" --wait --types "worker_done,escalation,question" --timeout-ms 580000 --json 2>&1 | grep -v _keepalive | python3 -I -c '
import sys,json
d=json.load(sys.stdin)["result"]
print("delivery",d.get("deliveryId"),"timedOut",d.get("timedOut"),"count",d.get("count"))
for m in d.get("messages",[]):
  p=json.loads(m["payload"] or "{}")
  if m["type"]!="heartbeat": print("\n==",m["id"],m["type"],m["from_handle"],"\n",m.get("body","")[:2500],"\n",m["payload"][:2500])
  else: print("hb",p.get("taskId"),p.get("phase"))'
