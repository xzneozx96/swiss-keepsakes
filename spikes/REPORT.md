# Sprint 0 spikes report (uncommitted)

Branch xzneozx96/e0-spikes, three commits on main 41170d6. Run on Node 22.15, Docker 29.8, no `spikes/.env`.

1. `npm --prefix spikes run spikes`, exit 0:

```
Spike | Ran         | Result | Missing keys
SP1   | RAN (local) | PASS   | STRIPE_SECRET_KEY
SP2   | RAN (local) | PASS   | DATABASE_URL_DIRECT
SP3   | RAN (local) | PASS   | DATABASE_URL_POOLED, DATABASE_URL_DIRECT, FLY_REGION
SP4   | SKIPPED     | -      | STRIPE_SECRET_KEY
SP5   | SKIPPED     | -      | AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, AWS_REGION
SP6   | SKIPPED     | -      | NEON_AUTH_URL, SP6_JWT
SP7   | SKIPPED     | -      | FLY_API_TOKEN, FLY_APP_STAGING, DATABASE_URL_DDL, DATABASE_URL_POOLED
```

2. SP1: valid signature 200, tampered body 400, re-serialised body 400 (17 of 17 checks).
3. SP2 (LOCAL, Docker Postgres 17.11): rolled-back tx leaves 0 jobs and 0 rows. Fire delay min 489.9 / avg 1914.1 / max 3979.2 ms with `batchSize: 10`; on pg-boss defaults six same-deadline jobs drain serially, max 9990.6 ms. Two processes: 10 of 10 jobs ran once, max delay 2005.3 ms; cron-minute ticks ran once.
4. SP3 (LOCAL): `pending_payment` = 1 of 50 in all 6 rounds, p95 41.2 ms over 250 measured requests (p50 34.4, p99 42.3).
5. `npx tsc --noEmit -p spikes`: clean.
6. `docker ps -a`: no `sk-spike-pg`; no spike process or port left.
7. All files in the three commits are under `spikes/**`, `docs/spikes/**`, plus `.gitignore`. `git grep` finds no key, secret or credentialed URL.

Not observed, so not claimed: Stripe CLI round trip (SP1), Neon Frankfurt and Fly runs (SP2, SP3), everything in SP4 to SP7.

## Neon follow-up run (Neon env names, real Neon)

Env: repo-root `.env.local` (Neon official names), SP2/SP3 against a throwaway branch `spike-sp2-sp3` (copy of production, `--expires-at` +1 day, deleted afterwards, URLs only in a 0600 file under /tmp/opencode, removed). Postgres on Neon is 18.6 (architecture assumes 17). Note: `.env.local` moved in the main checkout to `api/.env.local` during the run and its NEON_BRANCH changed from production to development; `lib/env.ts` now falls back to `api/.env.local`.

```
Spike | Ran                | Result | Missing keys
SP1   | RAN (local)        | PASS   | STRIPE_SECRET_KEY
SP2   | RAN (local+remote) | PASS   | -
SP3   | RAN (local+remote) | PASS   | -
SP4   | SKIPPED            | -      | STRIPE_SECRET_KEY
SP5   | RAN (remote)       | PASS   | -
SP6   | RAN (remote)       | PASS   | -
SP7   | SKIPPED            | -      | FLY_API_TOKEN, FLY_APP_STAGING, DATABASE_URL_DDL
```
exit 0.

- SP2 (Neon direct, laptop): 14 deferred jobs fire min 472 / avg 1507 / max 2354 ms after hold_until (limit 5000); rolled-back tx leaves 0 jobs; 10 jobs across two processes ran once each (6/4); cron once across two processes (no duplicate slots).
- SP3 (Neon pooled, laptop to Frankfurt, NOT Fly fra): every round 1 pending_payment of 50 (201=1, 409=49); p95 2586.8 ms (p50 1811.5, max 2742); local same code p95 42.4 ms.
- SP5: presigned PUT uploads 200; anonymous GET of private `uploads` object 403; `media` presigned PUT 200, anonymous GET 200. Test objects deleted.
- SP6: JWKS Ed25519 ok; email+password sign-up works with no email code; GET /token returns a JWT; verifies with jose against NEON_AUTH_JWKS_URL; lifetime exp-iat = 900 s. Client /delete-user is 404; test users deleted with `neon neon-auth user delete` (none left).
- `neon branches list`: no spike branch left (production, staging, development remain, not mine).

## Fix-up run (plain `npm run spikes`, api/.env.local only)

Exit 0. SP1 local PASS; SP2 and SP3 local+remote PASS, each on its own throwaway branch created from development and deleted in a finally; SP5 PASS; SP6 automated part PASS (user deleted via the Neon CLI, SQL count of sp6-test-% users 0) with the manual iOS items printed as MANUAL OPEN; SP4 and SP7 skipped. Afterwards: branches are production, staging, development only; development has 0 test users, no pgboss schema, no sp*_spike schema.
