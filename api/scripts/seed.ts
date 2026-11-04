import process from 'node:process'
import { Pool } from 'pg'
import { createDatabase } from '../src/platform/db/client.ts'
import { seedContent } from './seed-content.ts'
import { pickStore, printSeedFailure, seedDatabaseUrl } from './seed-guard.ts'

// `pnpm --filter @sk/api db:seed` imports the prototype's stories and tour guides as drafts into one store. The
// store is SEED_STORE_ID, else the only store; none, or several without the id, stops with nothing written. It
// prints counts and never the connection string. Run it again and nothing changes.
// It reads only DATABASE_URL, because `--env-file-if-exists=.env.local` can pull in the shared development
// database. It refuses a host that is not local (or a URL with a host, hostaddr or service parameter) unless SEED_ALLOW_REMOTE_DATABASE=1 is set.
async function main(): Promise<number> {
  const url = seedDatabaseUrl()
  if (!url)
    return 2
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 5_000 })
  try {
    const storeId = await pickStore(pool)
    if (!storeId)
      return 1
    const counts = await seedContent(createDatabase(pool), storeId)
    process.stdout.write(`Seeded ${counts.stories} stories and ${counts.tours} tours as drafts into store ${storeId}.\n`)
    return 0
  }
  finally {
    await pool.end()
  }
}

main().then(
  (code) => {
    process.exitCode = code
  },
  printSeedFailure,
)
