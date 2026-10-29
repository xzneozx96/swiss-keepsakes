// Starts the servers of the Playwright specs and keeps them running until Ctrl-C or SIGTERM, for runs with E2E_REUSE=1:
//   pnpm e2e:servers              demo dev server (5391), e2e API (5394, inbox 5393) and API-mode dev server (5392)
//   pnpm e2e:servers --api-only   without the demo server
// The e2e API makes one sk_test_* database on the Neon development branch and drops it when this script stops.
// The URLs come from the environment, or from api/.env.local. They are never printed.
// See docs/development-rules/shared/testing.md.
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { API_PORT, INBOX_PORT, SPA_PORT } from '../tests/e2e/api-server.ts'

const frontEnd = fileURLToPath(new URL('..', import.meta.url))
const root = resolve(frontEnd, '..')
const demoPort = Number(process.env.E2E_PORT ?? 5391)
const apiOnly = process.argv.includes('--api-only')
const databaseLine = /^(DATABASE_URL(?:_UNPOOLED)?)=(.*)$/
const quoted = /^(['"])(.*)\1$/

function neonEnv() {
  const wanted = ['DATABASE_URL', 'DATABASE_URL_UNPOOLED']
  const found = Object.fromEntries(wanted.filter(name => process.env[name]).map(name => [name, process.env[name]]))

  if (wanted.every(name => found[name]))
    return found

  try {
    for (const line of readFileSync(resolve(root, 'api/.env.local'), 'utf8').split('\n')) {
      const match = databaseLine.exec(line.trim())
      if (match && !found[match[1]])
        found[match[1]] = match[2].replace(quoted, '$2')
    }
  }
  catch {}

  return found
}

const database = neonEnv()
if (!database.DATABASE_URL || !database.DATABASE_URL_UNPOOLED) {
  process.stderr.write('DATABASE_URL and DATABASE_URL_UNPOOLED are not set and api/.env.local does not have them.\n')
  process.exit(1)
}

const servers = [
  ...(apiOnly
    ? []
    : [{
        name: 'demo dev server',
        command: 'pnpm',
        args: ['dev', '--port', String(demoPort), '--strictPort'],
        cwd: frontEnd,
        env: { VITE_API_ENABLED: '' },
        url: `http://localhost:${demoPort}`,
        group: true,
      }]),
  {
    name: 'e2e API',
    command: process.execPath,
    args: ['--import', 'tsx', 'test/support/e2e-server.ts'],
    cwd: resolve(root, 'api'),
    env: {
      ...database,
      INTEGRATION_ALLOW_REMOTE_DATABASE: '1',
      E2E_API_PORT: String(API_PORT),
      E2E_INBOX_PORT: String(INBOX_PORT),
      E2E_ORIGIN: `http://localhost:${SPA_PORT}`,
    },
    url: `http://127.0.0.1:${INBOX_PORT}/ready`,
    group: false,
  },
  {
    name: 'API-mode dev server',
    command: 'pnpm',
    args: ['dev', '--port', String(SPA_PORT), '--strictPort'],
    cwd: frontEnd,
    env: { VITE_API_ENABLED: 'true', API_PROXY_TARGET: `http://127.0.0.1:${API_PORT}` },
    url: `http://localhost:${SPA_PORT}`,
    group: true,
  },
]

const running = []
let stopping = false

/** SIGTERM to the process (the API drops its database on it) or, for `pnpm dev`, to its whole process group. */
function terminate(child, signal = 'SIGTERM') {
  // A group is signalled even after its pnpm leader exited, so vite is not orphaned. A lone process that exited is skipped.
  if (!child.group && (child.exitCode !== null || child.signalCode !== null))
    return
  try {
    process.kill(child.group ? -child.pid : child.pid, signal)
  }
  catch {}
}

async function stop(code) {
  if (stopping)
    return
  stopping = true
  process.stdout.write('\nStopping the e2e servers (the API drops its test database)...\n')
  running.forEach(({ child }) => terminate(child))
  const killer = setTimeout(() => running.forEach(({ child }) => terminate(child, 'SIGKILL')), 25_000)
  await Promise.all(running.map(({ child }) => child.exitCode !== null || child.signalCode !== null
    ? undefined
    : new Promise(done => child.once('close', done))))
  clearTimeout(killer)
  process.exit(code)
}

process.on('SIGINT', () => void stop(0))
process.on('SIGTERM', () => void stop(0))

async function answers(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) })

    return response.status < 400 || [401, 402, 403].includes(response.status)
  }
  catch {
    return false
  }
}

for (const server of servers) {
  const child = spawn(server.command, server.args, {
    cwd: server.cwd,
    env: { ...process.env, ...server.env },
    detached: server.group,
    stdio: ['ignore', 'ignore', 'inherit'],
  })
  child.group = server.group
  running.push({ child, server })
  child.once('close', () => {
    if (!stopping) {
      process.stderr.write(`${server.name} stopped on its own. Stopping the rest.\n`)
      void stop(1)
    }
  })
  child.once('error', (error) => {
    if (!stopping) {
      process.stderr.write(`${server.name} could not start: ${error.message}. Stopping the rest.\n`)
      void stop(1)
    }
  })
}

const deadline = Date.now() + 180_000
for (const { server } of running) {
  while (!stopping && !await answers(server.url)) {
    if (Date.now() > deadline) {
      process.stderr.write(`${server.name} did not answer on ${server.url} in time.\n`)
      await stop(1)
    }
    await new Promise(done => setTimeout(done, 500))
  }
}

if (!stopping) {
  process.stdout.write(`E2E servers ready (pid ${process.pid}) for ${root}\n`)
  if (!apiOnly)
    process.stdout.write(`  demo dev server      http://localhost:${demoPort}\n`)
  process.stdout.write(`  API-mode dev server  http://localhost:${SPA_PORT}\n  e2e API              http://127.0.0.1:${API_PORT} (inbox ${INBOX_PORT})\n`)
  process.stdout.write(`Run: E2E_REUSE=1 pnpm test:e2e <spec> --project api-chromium-en --workers=2\nStop with Ctrl-C or: kill ${process.pid}\n`)
}
