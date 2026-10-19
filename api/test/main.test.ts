import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

// Runs the real entry point (src/main.ts) in a child process, the way `pnpm dev` and production start it.
const apiDir = fileURLToPath(new URL('..', import.meta.url))
const DATABASE_URL = 'postgres://postgres@127.0.0.1:5433/swiss_keepsakes'

interface LogLine { msg: string, port?: number, role?: string }

const children = new Set<ChildProcess>()

afterEach(() => {
  for (const child of children) child.kill('SIGKILL')
  children.clear()
})

function start(env: Record<string, string>) {
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/main.ts'], {
    cwd: apiDir,
    env: { PATH: process.env.PATH ?? '', ...env },
  })
  children.add(child)
  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
    stdout += chunk
  })
  child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
    stderr += chunk
  })
  // 'close' fires after stdout and stderr are drained; 'exit' can fire before.
  const exited = once(child, 'close').then(([code]) => code as number | null)
  // Only finished lines: a chunk can end in the middle of one.
  const logs = () => stdout.split('\n').slice(0, -1).map(line => JSON.parse(line) as LogLine)
  const messages = () => logs().map(line => line.msg)

  async function waitFor(msg: string) {
    while (!messages().includes(msg)) {
      if (child.exitCode !== null)
        throw new Error(`exited before "${msg}": ${stderr}`)
      await new Promise(resolve => setTimeout(resolve, 20))
    }
  }

  return { child, exited, logs, messages, waitFor, output: () => stdout + stderr }
}

const env = (role: string) => ({ ROLE: role, PORT: '0', DATABASE_URL })

describe('[E1.8] main: the ROLE switch and process lifecycle', () => {
  it('[E1.8] ROLE=api serves /healthz and starts no worker, and SIGTERM stops it with exit code 0', async () => {
    const run = start(env('api'))
    await run.waitFor('started')
    const port = run.logs().find(line => line.msg === 'api listening')?.port
    const response = await fetch(`http://127.0.0.1:${port}/healthz`)

    expect(response.status).toBe(200)
    expect(run.messages()).not.toContain('worker started')

    run.child.kill('SIGTERM')
    expect(await run.exited).toBe(0)
    expect(run.messages()).toEqual(['api listening', 'started', 'request', 'shutting down', 'stopped'])
  })

  it('[E1.8] ROLE=worker starts only the worker, and SIGTERM stops it with exit code 0', async () => {
    const run = start(env('worker'))
    await run.waitFor('started')

    run.child.kill('SIGTERM')
    expect(await run.exited).toBe(0)
    expect(run.messages()).toEqual(['worker started', 'started', 'shutting down', 'worker stopped', 'stopped'])
  })

  it('[E1.8] ROLE=all starts the API and the worker in one process, and SIGINT stops both', async () => {
    const run = start(env('all'))
    await run.waitFor('started')

    expect(run.logs().find(line => line.msg === 'started')?.role).toBe('all')

    run.child.kill('SIGINT')
    expect(await run.exited).toBe(0)
    expect(run.messages()).toEqual(['api listening', 'worker started', 'started', 'shutting down', 'worker stopped', 'stopped'])
  })

  it('[E1.8] a bad env value stops startup with exit code 1 and a message that names the variable but not the value', async () => {
    const run = start({ ROLE: 'api', DATABASE_URL: 'mysql://admin:s3cret-pw@db.example/sk' })

    expect(await run.exited).toBe(1)
    expect(run.output()).toContain('DATABASE_URL: Expected a postgres:// or postgresql:// URL')
    expect(run.output()).not.toContain('s3cret-pw')
    expect(run.messages()).toEqual([])
  })

  it('[E1.8] a missing DATABASE_URL stops startup with exit code 1', async () => {
    const run = start({ ROLE: 'all' })

    expect(await run.exited).toBe(1)
    expect(run.output()).toContain('DATABASE_URL: Required')
  })
})
