#!/usr/bin/env bash
# Ack heartbeat-only deliveries; return on the first batch with a real message (or after ~9.5 min).
ack="${1:-}"; end=$((SECONDS+440))
while [ $SECONDS -lt $end ]; do
  args=(--wait --types "worker_done,escalation,question" --timeout-ms 120000 --json)
  [ -n "$ack" ] && args=(--ack "$ack" "${args[@]}")
  out=$(orca-ide orchestration check "${args[@]}" 2>&1 | grep -v _keepalive)
  read -r did real < <(printf '%s' "$out" | python3 -I -c '
import sys,json
d=json.load(sys.stdin)["result"]; ms=d.get("messages",[])
print(d.get("deliveryId") or "-", sum(m["type"]!="heartbeat" for m in ms))')
  ack=""; [ "$did" != "-" ] && ack="$did"
  if [ "${real:-0}" -gt 0 ]; then printf '%s' "$out" | python3 -I -c '
import sys,json
d=json.load(sys.stdin)["result"]; print("delivery",d.get("deliveryId"))
for m in d.get("messages",[]):
  if m["type"]!="heartbeat": print("\n==",m["id"],m["type"],m["from_handle"],"\n",m.get("body","")[:3000],"\n",m["payload"][:1500])'; exit 0; fi
done
echo "no real messages; pending ack: $ack"
