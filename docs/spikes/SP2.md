# SP2. pg-boss deferred jobs through Drizzle, in a transaction

**Status: Answered (local and Neon).** Two results below: LOCAL on a throwaway Docker Postgres 17.11, and NEON on a throwaway branch of the Frankfurt project (Postgres 18.6, direct connection, run from a laptop).

**Pass condition (architecture section 16).** The job fires within 5 seconds of the deadline. Cron jobs run once across two machines.

## What ran

`npx tsx spikes/sp2-pgboss/run.ts` with `pg-boss@12.38.0`, `drizzle-orm@0.45.4`, `pg@8.23`, container `sk-spike-pg` (`postgres:17-alpine`, removed afterwards). Jobs are created with `boss.send(queue, data, { startAfter: holdUntil, db: fromDrizzle(tx, sql) })` inside `db.transaction`, together with the hold row. Clients are on the same host as the database, so there is no network latency in these numbers. "Two machines" means two `tsx` worker processes, each with pg-boss supervision and scheduling on, the way two `ROLE=all` machines would run.

## Observed (LOCAL)

| Check | Result |
|---|---|
| Transaction rolled back after `boss.send` | 0 jobs and 0 hold rows left: the job is created in the caller's transaction |
| 4 spread-out and 10 same-deadline jobs, worker with `batchSize: 10`, default polling (2 s) | all fired once; delay after `hold_until` min 489.9 ms, avg 1914.1 ms, max 3979.2 ms (limit 5000) |
| One job on pg-boss defaults (`batchSize` 1, polling 2 s) | delay 10.0 ms |
| 6 jobs sharing one deadline on pg-boss defaults | min 3.4 ms, avg 5000.4 ms, max 9990.6 ms: one job per poll, so the backlog drains one every 2 s |
| 10 deferred jobs, two worker processes | each ran exactly once (all 10 were taken by one process in this run); delay min 191.6 ms, avg 1238.3 ms, max 2005.3 ms |
| `cron-minute` (`* * * * *`), two processes, 2 ticks observed | 2 runs, 2 distinct jobs, no duplicate slot (both ticks ran on process A) |
| `cron-rrule` (`FREQ=SECONDLY;INTERVAL=5`), two processes | 3 runs in roughly 100 s, 3 distinct jobs, no duplicates. The sub-minute rule did not fire every 5 s, so schedule at minute granularity |

Answers: the budget is met locally with a worker that fetches in batches. Deadline precision is set by the polling interval (2 s default) and batch size. A mass expiry at one instant (a tour that starts, many holds with the same `hold_until`) drains serially on the defaults and misses 5 s by the sixth job, so the real worker needs `batchSize` of 10 or more (`burstWhenBatchFull` is an unexplored option). The 4.0 s maximum with batching leaves only 1 s of margin and is worth a second look with `pollingIntervalSeconds: 1`. Not run.

## Observed (NEON, direct connection, laptop to Frankfurt)

The spike now creates and deletes this branch itself (from the env file's branch, expiry 24 h; it refuses production, staging and main). Branch `spike-sp2-sp3`, a copy of `production` made with `neon branches create --parent production --expires-at <+1 day>`, deleted afterwards. Server is **PostgreSQL 18.6**, not 17 as the architecture assumes (see Findings). The same suite, schema `sp2_spike`, dropped at the end. Not Fly `fra`, and the two workers are two processes on the laptop.

| Check | Result |
|---|---|
| Transaction rolled back after `boss.send` | 0 jobs, 0 hold rows |
| 4 spread-out and 10 same-deadline jobs, `batchSize: 10`, polling 2 s | all 14 fired once; delay after `hold_until` min 472.3 ms, avg 1507.4 ms, max 2353.9 ms (limit 5000): **PASS** |
| One job on pg-boss defaults | delay 2194.2 ms (locally 8.6 ms: here it waited for a poll) |
| 6 jobs sharing one deadline on defaults | min 2014 ms, avg 5501 ms, max 8125 ms: serial drain, as locally |
| 10 deferred jobs, two worker processes | each ran exactly once (6 on one process, 4 on the other); delay min 222.6 ms, avg 1534.7 ms, max 3250.5 ms |
| `cron-minute`, two processes, 2 ticks | 2 runs, 2 distinct jobs, no duplicate slot |
| `cron-rrule`, two processes | 3 runs, 3 distinct jobs, no duplicates (split 2 and 1 between the processes) |

Answers: the 5 s budget and cron-once both hold on Neon through the direct connection, including pg-boss's own schema and supervision on Postgres 18. Work was shared across the two processes for the first time (locally one process took everything).

## Findings

- Neon runs Postgres 18.6; the architecture assumes 17. pg-boss 12.38 worked unchanged. Local Docker should move to `postgres:18` so dev matches.

## Open

Timings from Fly `fra` machines and two real machines are not measured. The 4 s maximum locally (2.4 s on Neon) is within budget but `pollingIntervalSeconds: 1` is not tried.
