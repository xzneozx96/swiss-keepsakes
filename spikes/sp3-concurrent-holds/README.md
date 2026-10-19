# SP3. 50 concurrent holds for one seat

**What it proves.** 50 concurrent `POST /api/holds` for one free seat produce exactly one `pending_payment` row (a partial unique index plus `ON CONFLICT DO NOTHING`), one pg-boss expiry job, one 201 and 49 409s. Request handlers use the pooled connection, pg-boss uses the direct one.

**Pass condition (architecture section 16).** Exactly one `pending_payment`. p95 latency recorded.

## Run

```sh
npx tsx spikes/sp3-concurrent-holds/run.ts
```

1. **LOCAL**: throwaway Docker Postgres 17 (`sk-spike-pg`). Pooled and direct are the same server, with no PgBouncer and no network. 1 warm-up round and 5 measured rounds of 50 requests, each round on a fresh seat. The p95 over the 250 measured requests is printed. Mark it LOCAL: it proves the correctness of the race handling, not the Frankfurt latency.
2. **REMOTE**: needs `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and `FLY_REGION`. Run it on a Fly `fra` machine (Fly sets `FLY_REGION`): `fly machine run` an image that has `spikes/`, or `fly ssh console` into the staging machine and run the script. From a laptop, set `SP3_ALLOW_NON_FLY=1` to check correctness only. The latency is then not an SP3 result. When `FLY_REGION` is not `fra` the run fails.

## Keys

`DATABASE_URL` (host with `-pooler`), `DATABASE_URL_UNPOOLED` (host without it), `FLY_REGION` (set by Fly itself), and `NEON_BRANCH` set to a throwaway branch (the REMOTE part is skipped while it is `production`, the value in `.env.local`).

## Vendor guidance applied

- `neon-postgres`: the "pooled for application traffic, direct for pg-boss" split from the pooled-vs-direct table. A transaction holds one pooled connection, so PgBouncer transaction mode is safe.
- `neon-postgres-branches`: run it on a throwaway branch.
