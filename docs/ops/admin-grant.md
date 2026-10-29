# Granting the first Super Admin

The Super Admin invites each Owner and sees every store. No screen adds one. The first Super Admin is made with a script, because nobody can grant it (architecture section 9, owner decision of 20.10.2026).

## What the script does

`pnpm --filter @sk/api admin:grant <email> --database <name>`

1. It reads `DATABASE_URL_UNPOOLED` from the shell and nothing else. It loads no env file, so it never reaches a database by accident. It asks the server for `current_database()` and refuses, changing nothing, unless that equals `--database`. It then prints `Target database <name>, role <role>.` and goes on. It prints no host and no URL.
2. It looks the user up by email in Better Auth's `identity.user` table. The email is trimmed and compared in lower case.
3. It refuses when there is no such user, or when the user is already a Super Admin.
4. It inserts the user's `identity.platform_admins` row with `granted_by` null, in one transaction.
5. It prints `Granted Super Admin to user <id>.` and never prints a connection string, a password or a token.

Exit codes: 0 granted, 1 refused or failed, 2 a missing or misplaced argument, a missing `DATABASE_URL_UNPOOLED`, or a `--database` that does not match.

## Steps

1. The person signs in once at the environment's own address, with Google or the emailed code. Better Auth makes the user row then. The script cannot make a user.
2. A Super Admin holds no store role (section 9). Use an address that is not the Owner's, because the operator needs a separate account for store work.
3. Set `DATABASE_URL_UNPOOLED` in your shell to the direct URL of the environment you mean. Take it from the Neon console or from `neon env pull` into a file you do not commit. Check which environment it points at before you run the script.
4. Run `pnpm --filter @sk/api admin:grant <email> --database <name>`, with the database name of the environment you checked in step 3. A wrong name stops the script before it writes.
5. The person reloads. `GET /api/admin/stores` now answers 200 for them, and `/api/store/{storeId}/*` still answers 403, whatever store they belonged to.

### Local testing

The Neon `development` branch's own database may hold one Super Admin, so you can test the admin and store screens locally. Grant it to an address that is not a store Owner. Run it by hand, never from a test or from CI.

1. Sign in once at http://localhost:3002.
2. From the repo root, run:

   ```sh
   env $(grep -E '^DATABASE_URL_UNPOOLED=' api/.env.local | xargs) pnpm --filter @sk/api admin:grant <email> --database neondb
   ```

3. Create a store in Admin, then invite a different address as Owner.

The development branch already has one Super Admin, granted on 29.10.2026, so a second grant is rarely needed.

## Rules

- Run it against `staging` and `production` only when you mean to. Do not run it from a test or from CI. The one exception is local testing (see Local testing): the Neon `development` branch's own database may hold one Super Admin. The integration tests run it against their own `sk_test_*` database.
- It grants nothing a second time. A repeat prints `This user is already a Super Admin. Nothing changed.` and exits 1.

## Take a Super Admin away

There is no command. Delete the user's row in a database console, in a transaction, and record who and why in the team's log.

```sql
delete from identity.platform_admins where user_id = '<user id>';
```

The user is an ordinary guest, or staff if they have memberships, on their next request, because the API reads the row on every request.
