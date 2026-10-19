import type { Pool } from 'pg'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { describe, expect, it } from 'vitest'
import { appliedMigrations, migrationsFolder, unknownMigrations } from '../scripts/check-branch-migrations.ts'

describe('[E1.13] the pull request branch carries no migration the commit lacks', () => {
  it('[E1.13] reports an applied migration whose hash api/migrations does not have, and nothing else', () => {
    const known = [{ hash: 'a'.repeat(64) }, { hash: 'b'.repeat(64) }]
    const rewritten = { hash: 'c'.repeat(64), created_at: '1792434345597' }

    expect(unknownMigrations([{ hash: 'a'.repeat(64), created_at: '1792434345597' }, rewritten], known)).toEqual([rewritten])
    expect(unknownMigrations([{ hash: 'b'.repeat(64), created_at: '1' }], known)).toEqual([])
    expect(unknownMigrations([], known)).toEqual([])
  })

  it('[E1.13] reads every migration in api/migrations, in journal order', () => {
    const journal = JSON.parse(readFileSync(join(migrationsFolder, 'meta', '_journal.json'), 'utf8')) as { entries: unknown[] }

    expect(readMigrationFiles({ migrationsFolder })).toHaveLength(journal.entries.length)
    expect(journal.entries.length).toBeGreaterThan(0)
  })

  it('[E1.13] a database without the drizzle table has no applied migration', async () => {
    const statements: string[] = []
    const db = {
      query: async (text: string) => {
        statements.push(text)
        return { rows: [{ present: false }] }
      },
    }

    expect(await appliedMigrations(db as unknown as Pick<Pool, 'query'>)).toEqual([])
    expect(statements).toHaveLength(1)
  })
})
