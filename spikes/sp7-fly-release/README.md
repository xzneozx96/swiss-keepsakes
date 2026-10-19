# SP7. Fly release command with Drizzle migrations, plus a rollback drill

**What it proves.** `release_command = "npx tsx migrate.ts"` runs Drizzle migrations with the DDL role before a new version takes traffic, a deploy with a migration and a rollback both run on a staging app without failed health probes, and a failing migration aborts the deploy and leaves the old version serving.

**Pass condition (architecture section 16).** A deploy with a migration, and a rollback, both run on staging without downtime.

## Run

```sh
npx tsx spikes/sp7-fly-release/run.ts
```

Needs `flyctl` on PATH and an empty staging Fly app in `fra` (`fly apps create <name> --org <org>`). The script stages the two database secrets (via stdin, never argv), then, while polling `/healthz` every 200 ms:

1. deploys v1 (one migration);
2. deploys v2 (adds a nullable column): the release command applies migration 0001;
3. rolls back by redeploying the v1 image (`flyctl deploy --image`): v1 runs on the migrated schema, which holds because the migration is additive (expand/contract);
4. deploys a build whose migration is broken: the release command fails, the deploy aborts, v1 keeps serving.

Each step expects zero failed probes. `app/fly.toml` uses `strategy = "bluegreen"` on one machine with an HTTP health check. Whether that really gives zero failed probes is what the run measures. If it does not, try two machines with the default rolling strategy.

`app/migrate.ts` and the three migration sets in `app/drizzle/` (`v1`, `v2`, `bad`) were checked against a local Postgres 17: v1 and v2 apply, re-applying is a no-op, `bad` fails. That is not an SP7 result, since there was no Fly deploy.

## Keys

`FLY_API_TOKEN` (app-scoped deploy token for the staging app only), `FLY_APP_STAGING`, `DATABASE_URL_DDL` (direct connection string of the DDL role), `DATABASE_URL` (DML-only app role).

## Vendor guidance applied

- `neon-postgres`: migrations run on a direct connection, the app on the pooled one. Drizzle Kit style migration journals, tested on a branch of production before applying to production (use `neon-postgres-branches`: `--expires-at` on the staging branch).
- `neon`: secrets go in through `flyctl secrets import` on stdin, and the DDL role is held only by the release command, not by the running app.
