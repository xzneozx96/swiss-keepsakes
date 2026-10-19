import type { MigrationMeta } from 'drizzle-orm/migrator'
import type { Pool } from 'pg'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { Client } from 'pg'

// CI only (E1.13): `pnpm --filter @sk/api db:check-branch` before migrating the pull request's Neon branch.
// A reused branch keeps what earlier pushes applied, and drizzle's migrator compares timestamps only, so it would
// not notice a migration that was rewritten or removed since. Not part of the release command: a rollback deploys
// an older image onto a newer schema on purpose.

export interface AppliedMigration { hash: string, created_at: string }

export const migrationsFolder = fileURLToPath(new URL('../migrations', import.meta.url))

export function unknownMigrations(applied: AppliedMigration[], known: Pick<MigrationMeta, 'hash'>[]): AppliedMigration[] {
  const hashes = new Set(known.map(migration => migration.hash))
  return applied.filter(row => !hashes.has(row.hash))
}

export async function appliedMigrations(db: Pick<Pool, 'query'>): Promise<AppliedMigration[]> {
  // A branch that never ran a migration has no table.
  const { rows: [table] } = await db.query<{ present: boolean }>(`select to_regclass('drizzle.__drizzle_migrations') is not null as present`)
  if (!table?.present)
    return []
  const { rows } = await db.query<AppliedMigration>('select hash, created_at::text from drizzle.__drizzle_migrations order by created_at')
  return rows
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED })
  await client.connect()
  let applied: AppliedMigration[]
  try {
    applied = await appliedMigrations(client)
  }
  finally {
    await client.end()
  }
  const unknown = unknownMigrations(applied, readMigrationFiles({ migrationsFolder }))
  if (unknown.length) {
    const rows = unknown.map(row => `  created_at ${row.created_at}, hash ${row.hash.slice(0, 12)}`)
    process.stderr.write([
      `::error::The database has ${unknown.length} applied migration(s) that api/migrations does not have:`,
      ...rows,
      'A reused pull request branch keeps what earlier pushes applied. Close and reopen the pull request for a fresh branch from development.',
      'If development has them too, code that is not in this branch migrated development.',
      '',
    ].join('\n'))
    process.exit(1)
  }
  process.stdout.write(`${applied.length} applied migration(s), all in api/migrations\n`)
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main()
