# Sprint 0 spikes (SP1 to SP7)

Throwaway scripts that answer the seven open questions in `docs/architecture/backend.md` section 16. Written answers live in `docs/spikes/SP1.md` to `SP7.md`.

```sh
npm --prefix spikes install
npm --prefix spikes run spikes            # all seven, then a table
npm --prefix spikes run spikes SP2 SP3    # a subset
VERBOSE=1 npm --prefix spikes run spikes  # stream every spike's output
npx tsx spikes/sp5-object-storage/run.ts  # one spike on its own
```

Every spike declares its keys with zod (`lib/env.ts`). A missing key prints `SKIP <spike>: missing KEY1, KEY2` and exits 0. With keys present the spike runs for real and exits non-zero on failure. Values are never printed. Copy `.env.example` to `.env` and fill in what you have.

| Spike | Runs now with no account | Needs keys for the rest |
|---|---|---|
| SP1 Hono + Stripe webhook + SPA | Hono, zod-openapi, raw-body signature checks, SPA fallback | `STRIPE_SECRET_KEY` for the Stripe CLI round trip |
| SP2 pg-boss in a Drizzle transaction | Everything, on a throwaway Docker Postgres 17 (`sk-spike-pg`) | `DATABASE_URL_DIRECT` for the Neon run |
| SP3 50 concurrent holds | Everything, on the same Docker Postgres | `DATABASE_URL_POOLED`, `DATABASE_URL_DIRECT`, `FLY_REGION` (a Fly fra machine) |
| SP4 Stripe sandbox | nothing | `STRIPE_SECRET_KEY` (+ `STRIPE_PUBLISHABLE_KEY` for the manual TWINT page) |
| SP5 Neon Object Storage | nothing | `AWS_*` branch credential |
| SP6 Neon Auth | nothing | `NEON_AUTH_URL`, `SP6_JWT`, plus a manual iOS Safari checklist |
| SP7 Fly release command | nothing | `FLY_API_TOKEN`, `FLY_APP_STAGING`, `DATABASE_URL_DDL`, `DATABASE_URL_POOLED` |

Docker is needed for the local SP2 and SP3 runs. Without it they print `SKIP ...: missing docker`. The container name is fixed (`sk-spike-pg`), so run SP2 and SP3 one after the other, which `run-all.ts` does. The container is removed when the spike ends, and on Ctrl+C.

Vendor guidance followed: the Neon skills (`neon`, `neon-postgres`, `neon-postgres-branches`, `neon-auth`, `neon-object-storage`) and the Stripe skills (`stripe-best-practices`, `stripe-docs`). Each spike README says which one guided which choice.
