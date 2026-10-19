# SP2. pg-boss deferred jobs through Drizzle, in a transaction

**What it proves.** A `hold-expiry` job enqueued with `boss.send(..., { db: fromDrizzle(tx, sql) })` inside a Drizzle transaction fires at `hold_until` within the budget, disappears with a rolled-back transaction, and runs once when two `ROLE=all` style processes share a database. Cron jobs also run once across two processes.

**Pass condition (architecture section 16).** The job fires within 5 seconds of the deadline. Cron jobs run once across two machines.

## Run

```sh
npx tsx spikes/sp2-pgboss/run.ts
```

Takes about 100 to 140 seconds, most of it waiting for two real cron minute boundaries.

1. **LOCAL**: starts `postgres:17-alpine` as `sk-spike-pg` on a free localhost port, runs the suite, removes the container. Mark the result LOCAL: no Neon, no Fly, no network latency.
2. **REMOTE**: if `DATABASE_URL_UNPOOLED` is set, the same suite runs against that database in schema `sp2_spike`, dropped at the end. The two workers are two processes on the machine that runs the script, so this is not two Fly machines.

What the suite does: rolled-back transaction leaves no job and no row; 14 deferred jobs on a worker with `batchSize: 10` fire within 5 s; one job on pg-boss defaults; six jobs sharing a deadline on defaults (`batchSize` 1), recorded as information; then two worker processes (`worker.ts`) with scheduling on, 10 deferred jobs each executed exactly once, and the `cron-minute` and `cron-rrule` schedules checked for duplicate runs.

## Keys

`DATABASE_URL_UNPOOLED` (direct, no `-pooler`) of a throwaway Neon branch, and `NEON_BRANCH` set to that branch's name. `.env.local` holds the production branch, so the REMOTE part is skipped while `NEON_BRANCH` is `production`; export the throwaway branch's values in your shell.

## Vendor guidance applied

- `neon-postgres`: pg-boss and migrations use the direct connection, never the pooler (session state, LISTEN/NOTIFY).
- `neon-postgres-branches`: point the key at a short-lived branch (`--expires-at`), not production; the suite creates and drops only schema `sp2_spike`.
