# SP7. Fly release command with Drizzle migrations, plus a rollback drill

**Status: Ready, needs keys: FLY_API_TOKEN, FLY_APP_STAGING, DATABASE_URL_DDL, DATABASE_URL_POOLED.**

**Pass condition (architecture section 16).** A deploy with a migration, and a rollback, both run on staging without downtime.

## What is ready

`spikes/sp7-fly-release/run.ts` drives `flyctl` against a staging app with a tiny Hono app (`app/`) whose `fly.toml` sets `release_command = "npx tsx migrate.ts"`, `strategy = "bluegreen"` and an HTTP health check. It deploys v1, deploys v2 with an additive migration, redeploys the v1 image as a rollback, and deploys a build with a broken migration, polling `/healthz` every 200 ms throughout and expecting zero failed probes.

The migration runner and the three migration sets were exercised once on a local Postgres 17 container: v1 applied, v2 applied, re-running v2 was a no-op, and the broken set failed with a Drizzle query error. This does not answer SP7, since nothing was deployed to Fly. The run and `flyctl` flags were not exercised: `flyctl` is not installed here.

## Observed

Nothing yet on Fly.

| Item | Result |
|---|---|
| Deploy with a migration, zero failed probes | not run |
| Rollback (previous image on the migrated schema) | not run |
| Failing release command leaves the old version serving | not run |
