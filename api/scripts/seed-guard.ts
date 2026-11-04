import type { Pool } from 'pg'
import process from 'node:process'

// The host guard of db:seed. A URL is local when its host is a loopback name and no query parameter can point
// the driver somewhere else: pg honours `host`, `hostaddr` and `service` in the query string over the URL's host.
const localHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])
const overrides = ['host', 'hostaddr', 'service']

export function isLocalDatabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return localHosts.has(parsed.hostname) && overrides.every(name => !parsed.searchParams.has(name))
  }
  catch {
    return false
  }
}

// The URL a seed script may use, or undefined after saying why not. Only DATABASE_URL is read, and a remote host needs
// SEED_ALLOW_REMOTE_DATABASE=1. The caller exits with code 2 on undefined.
export function seedDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url) {
    process.stderr.write('DATABASE_URL is not set.\n')
    return undefined
  }
  if (!isLocalDatabaseUrl(url) && process.env.SEED_ALLOW_REMOTE_DATABASE !== '1') {
    process.stderr.write('Refused: host is not local. Set SEED_ALLOW_REMOTE_DATABASE=1 to seed a remote database. Nothing was written.\n')
    return undefined
  }
  return url
}

// SEED_STORE_ID, else the only store; none, or several without the id, says so and returns undefined.
export async function pickStore(pool: Pool): Promise<string | undefined> {
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

// The error's message can quote the connection string, so only its type and code are printed.
export function printSeedFailure(error: unknown): void {
  const { name, code } = error as { name?: string, code?: string }
  process.stderr.write(`The seed failed: ${name ?? 'Error'}${code ? ` ${code}` : ''}\n`)
  process.exitCode = 1
}
