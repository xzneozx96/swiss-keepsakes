import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:net'
import pg from 'pg'

export const CONTAINER = 'sk-spike-pg'
const IMAGE = 'postgres:17-alpine'

export function dockerAvailable(): boolean {
  try {
    execFileSync('docker', ['info'], { stdio: 'ignore', timeout: 15000 })
    return true
  } catch {
    return false
  }
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(() => resolve(port))
    })
  })
}

export function removeContainer(): void {
  try {
    execFileSync('docker', ['rm', '-f', '-v', CONTAINER], { stdio: 'ignore' })
  } catch {
    return
  }
}

async function waitReady(url: string): Promise<void> {
  const deadline = Date.now() + 60000
  while (Date.now() < deadline) {
    const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 2000 })
    try {
      await client.connect()
      await client.query('select 1')
      await client.end()
      return
    } catch {
      await client.end().catch(() => undefined)
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  throw new Error('local Postgres did not become ready in 60 s')
}

export interface LocalPostgres {
  url: string
  version: string
}

export async function withLocalPostgres<T>(fn: (db: LocalPostgres) => Promise<T>): Promise<T> {
  removeContainer()
  const PASSWORD = randomBytes(16).toString('hex')
  const port = await freePort()
  const onSignal = () => {
    removeContainer()
    process.exit(130)
  }
  process.once('SIGINT', onSignal)
  process.once('SIGTERM', onSignal)
  try {
    execFileSync(
      'docker',
      [
        'run', '-d', '--rm', '--name', CONTAINER,
        '-e', `POSTGRES_PASSWORD=${PASSWORD}`,
        '-p', `127.0.0.1:${port}:5432`,
        IMAGE,
        '-c', 'max_connections=200',
      ],
      { stdio: 'ignore' },
    )
    const url = `postgres://postgres:${PASSWORD}@127.0.0.1:${port}/postgres`
    await waitReady(url)
    const client = new pg.Client({ connectionString: url })
    await client.connect()
    const version = ((await client.query('show server_version')).rows[0] as { server_version: string }).server_version
    await client.end()
    return await fn({ url, version })
  } finally {
    process.off('SIGINT', onSignal)
    process.off('SIGTERM', onSignal)
    removeContainer()
  }
}
