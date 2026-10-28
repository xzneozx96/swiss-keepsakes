import process from 'node:process'
import { Pool } from 'pg'
import { createDatabase } from '../src/platform/db/client.ts'
import { seedContent } from './seed-content.ts'

// `pnpm --filter @sk/api db:seed` imports the prototype's stories and tour guides as drafts into one store. The
// store is SEED_STORE_ID, else the only store; none, or several without the id, stops with nothing written. It
// prints counts and never the connection string. Run it again and nothing changes.
// It reads only DATABASE_URL, because `--env-file-if-exists=.env.local` can pull in the shared development
// database. It refuses a host that is not local unless SEED_ALLOW_REMOTE_DATABASE=1 is set.
const localHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

function isLocalHost(url: string): boolean {
  try {
    return localHosts.has(new URL(url).hostname)
  }
  catch {
    return false
  }
}

async function pickStore(pool: Pool): Promise<string | undefined> {
  const wanted = process.env.SEED_STORE_ID
  if (wanted) {
    const { rows } = await pool.query<{ id: string }>('select id from identity.stores where id::text = $1', [wanted])
    if (!rows[0])
      process.stderr.write('SEED_STORE_ID names no store. Nothing was written.\n')
    return rows[0]?.id
  }
  const { rows } = await pool.query<{ id: string }>('select id from identity.stores limit 2')
  if (rows.length !== 1)
    process.stderr.write(`${rows.length === 0 ? 'There is no store' : 'There is more than one store'}. Set SEED_STORE_ID to the store to seed. Nothing was written.\n`)
  return rows.length === 1 ? rows[0]!.id : undefined
}

async function main(): Promise<number> {
  const url = process.env.DATABASE_URL
  if (!url) {
    process.stderr.write('DATABASE_URL is not set.\n')
    return 2
  }
  if (!isLocalHost(url) && process.env.SEED_ALLOW_REMOTE_DATABASE !== '1') {
    process.stderr.write('Refused: host is not local. Set SEED_ALLOW_REMOTE_DATABASE=1 to seed a remote database. Nothing was written.\n')
    return 2
  }
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
  (error) => {
    // The error's message can quote the connection string, so only its type and code are printed.
    const { name, code } = error as { name?: string, code?: string }
    process.stderr.write(`The seed failed: ${name ?? 'Error'}${code ? ` ${code}` : ''}\n`)
    process.exitCode = 1
  },
)
