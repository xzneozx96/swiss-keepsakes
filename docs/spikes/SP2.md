# SP2. pg-boss deferred jobs through Drizzle, in a transaction

**Status: Answered (local).** LOCAL result on a throwaway Docker Postgres 17.11, not Neon. Ready, needs keys for the Neon run: `DATABASE_URL_DIRECT`.

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

## Open

The same suite against Neon Frankfurt through the direct connection (`DATABASE_URL_DIRECT`). Timings from Fly `fra` machines, and two real machines, are not measured.
