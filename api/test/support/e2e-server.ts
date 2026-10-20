import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'
import { mailQueues } from '../../src/modules/notifications/adapters/jobs.ts'
import { renderMail } from '../../src/modules/notifications/application/render-mail.ts'
import { migrateDatabase } from '../../src/platform/db/migrate.ts'
import { createLogger } from '../../src/platform/logger.ts'
import { refusedDatabaseTarget } from './database-target.ts'

// The real API for the front-end's Playwright specs (front-end/playwright.config.ts starts this as a webServer).
// It makes a database of its own on the Neon `development` branch, the way integration/global-setup.ts does,
// migrates it, runs src/main.ts against it, and drops it when it is stopped. Never run it with the URLs of the
// production or staging branch.
//
// A second, test-only server on E2E_INBOX_PORT stands in for the inbox and for the database access a browser
// cannot have: GET /code reads the sign-in code from the queued N01 job (no worker runs, so no mail goes out),
// POST /expire ages that code, POST /age-limits lifts the rate limits, and POST /end-sessions deletes a guest's sessions.
const { DATABASE_URL: pooledEnv, DATABASE_URL_UNPOOLED: directEnv } = process.env
const apiPort = process.env.E2E_API_PORT ?? '5394'
const inboxPort = Number(process.env.E2E_INBOX_PORT ?? '5393')
const origin = process.env.E2E_ORIGIN ?? 'http://localhost:5392'
const apiDir = fileURLToPath(new URL('../..', import.meta.url))

const refused = refusedDatabaseTarget({ DATABASE_URL: pooledEnv, DATABASE_URL_UNPOOLED: directEnv }, process.env)
if (refused || !pooledEnv || !directEnv) {
  process.stderr.write(`E2E API not started: ${refused}\n`)
  process.exit(1)
}
const pooledUrl: string = pooledEnv
const directUrl: string = directEnv

function withDatabase(url: string, database: string): string {
  const parsed = new URL(url)
  parsed.pathname = `/${database}`
  return parsed.toString()
}

async function admin(statement: string) {
  const client = new Client({ connectionString: directUrl })
  await client.connect()
  try {
    await client.query(statement)
  }
  finally {
    await client.end()
  }
}

const database = `sk_test_${randomBytes(6).toString('hex')}`
const unpooled = withDatabase(directUrl, database)
let api: ChildProcess | undefined
let inbox: ReturnType<typeof createServer> | undefined
let ready = false
let stopping = false

async function stop(code: number) {
  if (stopping)
    return
  stopping = true
  inbox?.close()
  if (api && api.exitCode === null) {
    const exited = new Promise(resolve => api?.once('close', resolve))
    api.kill('SIGTERM')
    setTimeout(() => api?.kill('SIGKILL'), 8000).unref()
    await exited
  }
  try {
    await admin(`drop database if exists ${database} with (force)`)
  }
  catch (error) {
    process.stderr.write(`Could not drop ${database}: ${String(error)}\n`)
    code = 1
  }
  process.exit(code)
}

process.on('SIGINT', () => void stop(0))
process.on('SIGTERM', () => void stop(0))

async function main() {
  await admin(`create database ${database}`)
  try {
    await migrateDatabase(unpooled, createLogger('warn'))
  }
  catch (error) {
    process.stderr.write(`Migration failed: ${String(error)}\n`)
    await stop(1)
  }

  api = spawn(process.execPath, ['--import', 'tsx', 'src/main.ts'], {
    cwd: apiDir,
    env: {
      PATH: process.env.PATH ?? '',
      ROLE: 'api',
      HOST: '127.0.0.1',
      PORT: apiPort,
      LOG_LEVEL: 'info',
      DATABASE_URL: withDatabase(pooledUrl, database),
      DATABASE_URL_UNPOOLED: unpooled,
      BETTER_AUTH_URL: origin,
      // A placeholder of the right length, not a secret.
      BETTER_AUTH_SECRET: 'e2e-only-secret-0123456789-abcdefghij',
      // Google's side is stubbed in the specs, so these are placeholders too.
      GOOGLE_CLIENT_ID: 'e2e-google-client-id.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'e2e-google-client-secret',
    },
  })
  let buffered = ''
  api.stdout?.setEncoding('utf8').on('data', (chunk: string) => {
    buffered += chunk
    if (buffered.includes('"msg":"started"'))
      ready = true
    buffered = buffered.slice(-2000)
  })
  api.stderr?.pipe(process.stderr)
  api.once('close', () => void stop(1))

  const pool = new Client({ connectionString: unpooled })
  await pool.connect()

  function json(response: import('node:http').ServerResponse, status: number, body: unknown) {
    response.writeHead(status, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(body))
  }

  inbox = createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? '/', 'http://localhost')
      const email = url.searchParams.get('email') ?? ''
      if (url.pathname === '/ready')
        return json(response, ready ? 200 : 503, { ready })
      if (url.pathname === '/code' && request.method === 'GET') {
        const { rows } = await pool.query<{ data: Parameters<typeof renderMail>[0] }>(
          `select data from pgboss.job where name = $1 and data->>'to' = $2 order by created_on desc limit 1`,
          [mailQueues.send, email],
        )
        const data = rows[0]?.data
        if (!data)
          return json(response, 404, {})
        const { subject, text } = renderMail(data, undefined)
        return json(response, 200, { code: (data.params as { code: string }).code, language: data.language, template: data.template, subject, text })
      }
      if (url.pathname === '/expire' && request.method === 'POST') {
        await pool.query(`update identity.verification set expires_at = now() - interval '1 second' where identifier = $1`, [`sign-in-otp-${email}`])
        return json(response, 200, {})
      }
      if (url.pathname === '/age-limits' && request.method === 'POST') {
        // As if a minute had passed since the last counted call, so a rate limit lifts without waiting.
        await pool.query(`update identity.rate_limit set last_request = last_request - 61000`)
        return json(response, 200, {})
      }
      if (url.pathname === '/end-sessions' && request.method === 'POST') {
        await pool.query(`delete from identity.session where user_id = (select id from identity."user" where email = $1)`, [email])
        return json(response, 200, {})
      }
      json(response, 404, {})
    })().catch(error => json(response, 500, { error: String(error) }))
  })
  inbox.listen(inboxPort, '127.0.0.1')
}

main().catch((error) => {
  process.stderr.write(`E2E API failed: ${String(error)}\n`)
  void stop(1)
})
