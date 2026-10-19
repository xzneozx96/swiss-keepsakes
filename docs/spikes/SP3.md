# SP3. 50 concurrent holds for one seat

**Status: Answered (local).** LOCAL result on a throwaway Docker Postgres 17.11. The Neon Frankfurt from Fly `fra` run is not done. Ready, needs keys: `DATABASE_URL_POOLED`, `DATABASE_URL_DIRECT`, and a Fly `fra` machine (`FLY_REGION`).

**Pass condition (architecture section 16).** Exactly one `pending_payment`. p95 latency recorded.

## What ran

`npx tsx spikes/sp3-concurrent-holds/run.ts`. A Hono endpoint on a random localhost port inserts the hold in a Drizzle transaction with `INSERT ... ON CONFLICT DO NOTHING` against a partial unique index (`seat_id` where `status = 'pending_payment'`), and only the winner enqueues the `hold-expiry` job in the same transaction. The request pool has 20 connections and pg-boss has its own connection. Locally both are the same server. There is no PgBouncer and no network. 1 warm-up round plus 5 measured rounds, each of 50 concurrent real HTTP requests for a fresh seat.

## Observed (LOCAL)

- Every round, including the warm-up: `pending_payment` = 1 of 50, exactly one 201, 49 conflicts (409), no other status, exactly one expiry job for the seat.
- p95 latency over the 250 measured requests: **41.2 ms** (p50 34.4 ms, p99 42.3 ms, max 42.6 ms). An earlier run gave 39.8 ms. The warm-up round (first connections) was slower, p95 126 ms.

These latencies say nothing about Neon from Fly. They only show the race handling is correct and cheap.

## Open

The pass condition names Neon Frankfurt through the pooled connection from Fly `fra`: not observed. The script refuses to call a run a pass unless `FLY_REGION` is `fra`, unless `SP3_ALLOW_NON_FLY=1` (correctness only).
