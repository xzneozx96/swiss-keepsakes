# SP3. 50 concurrent holds for one seat

**Status: Correctness answered (local and Neon); Neon latency is a laptop number, not Fly `fra`.** LOCAL on a throwaway Docker Postgres 17.11, and NEON through the pooled URL from a laptop to Frankfurt.

**Pass condition (architecture section 16).** Exactly one `pending_payment`. p95 latency recorded.

## What ran

`npx tsx spikes/sp3-concurrent-holds/run.ts`. A Hono endpoint on a random localhost port inserts the hold in a Drizzle transaction with `INSERT ... ON CONFLICT DO NOTHING` against a partial unique index (`seat_id` where `status = 'pending_payment'`), and only the winner enqueues the `hold-expiry` job in the same transaction. The request pool has 20 connections and pg-boss has its own connection. Locally both are the same server. There is no PgBouncer and no network. 1 warm-up round plus 5 measured rounds, each of 50 concurrent real HTTP requests for a fresh seat.

## Observed (LOCAL)

- Every round, including the warm-up: `pending_payment` = 1 of 50, exactly one 201, 49 conflicts (409), no other status, exactly one expiry job for the seat.
- p95 latency over the 250 measured requests: **41.2 ms** (p50 34.4 ms, p99 42.3 ms, max 42.6 ms). An earlier run gave 39.8 ms. The warm-up round (first connections) was slower, p95 126 ms.

These latencies say nothing about Neon from Fly. They only show the race handling is correct and cheap.

## Observed (NEON, pooled connection, laptop to Frankfurt)

Branch `spike-sp2-sp3` (throwaway, deleted afterwards), Postgres 18.6. Requests use the pooled (`-pooler`, PgBouncer) URL, pg-boss the direct URL, with `SP3_ALLOW_NON_FLY=1`. **This is laptop to Frankfurt latency, not Fly `fra`.** It includes the laptop's internet round trip on every statement of the hold transaction.

- Every round, including the warm-up: `pending_payment` = 1 of 50, one 201, 49 conflicts (409), no other status, exactly one expiry job. The partial unique index plus `ON CONFLICT DO NOTHING` is correct through PgBouncer in transaction mode.
- p95 over the 250 measured requests: **2586.8 ms** (p50 1811.5 ms, p99 2736.7 ms, max 2742.0 ms). Warm-up round p95 3684.6 ms. Per round p95 2.44 to 2.74 s.
- Locally the same code gave p95 42.4 ms, so almost all of the Neon figure is network: each hold is several round trips (BEGIN, insert, enqueue, COMMIT) from a distant client.

The latency is not a valid answer to "p95 from Fly `fra`", which should be a small fraction of this. Correctness is.

## Open

p95 from a Fly `fra` machine. The script refuses to call a run a pass unless `FLY_REGION` is `fra`, unless `SP3_ALLOW_NON_FLY=1` (correctness only).
