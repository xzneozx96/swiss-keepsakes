# SP3. 50 concurrent holds for one seat

**What it proves.** 50 concurrent `POST /api/holds` for one free seat produce exactly one `pending_payment` row (a partial unique index plus `ON CONFLICT DO NOTHING`), one pg-boss expiry job, one 201 and 49 409s. Request handlers use the pooled connection, pg-boss uses the direct one.

**Pass condition (architecture section 16).** Exactly one `pending_payment`. p95 latency recorded.

## Run

```sh
npx tsx spikes/sp3-concurrent-holds/run.ts
```

1. **LOCAL**: throwaway Docker Postgres 17 (`sk-spike-pg`). Pooled and direct are the same server, with no PgBouncer and no network. 1 warm-up round and 5 measured rounds of 50 requests, each round on a fresh seat. The p95 over the 250 measured requests is printed. Mark it LOCAL: it proves the correctness of the race handling, not the Frankfurt latency.
2. **REMOTE**: creates its own throwaway Neon branch (see Keys). For a valid latency result run it on a Fly `fra` machine (Fly sets `FLY_REGION`): `fly machine run` an image that has `spikes/`, or `fly ssh console` into the staging machine and run the script. From a laptop (`FLY_REGION` empty) it checks correctness only; the latency is then not an SP3 result. When `FLY_REGION` is not `fra` the run fails.

## Keys

No Neon connection string is needed: the REMOTE part creates a throwaway branch from `NEON_BRANCH` (`api/.env.local`; project id from `api/.neon`), uses its pooled URL for requests and direct URL for pg-boss, then deletes the branch. It refuses `production`, `staging` and `main`. `FLY_REGION` is set by Fly; when empty the run is a laptop run (correctness valid, latency not a Fly result), and a non-`fra` region fails.

## Vendor guidance applied

- `neon-postgres`: the "pooled for application traffic, direct for pg-boss" split from the pooled-vs-direct table. A transaction holds one pooled connection, so PgBouncer transaction mode is safe.
- `neon-postgres-branches`: run it on a throwaway branch.
