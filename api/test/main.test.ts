import type { ChildProcess } from 'node:child_process'
import type { AddressInfo, Server } from 'node:net'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

// Runs the real entry point (src/main.ts) in a child process, the way `pnpm dev` and production start it.
const apiDir = fileURLToPath(new URL('..', import.meta.url))
const DATABASE_URL = 'postgres://postgres@127.0.0.1:5433/swiss_keepsakes'

interface LogLine { msg: string, level: number, address?: string, port?: number, role?: string, err?: Record<string, unknown> }

const children = new Set<ChildProcess>()
const blockers = new Set<Server>()

afterEach(() => {
  for (const child of children) child.kill('SIGKILL')
  children.clear()
  for (const blocker of blockers) blocker.close()
  blockers.clear()
})

function start(env: Record<string, string>, preload?: string) {
  const args = ['--import', 'tsx', ...(preload ? ['--import', `./test/fixtures/${preload}`] : []), 'src/main.ts']
  const child = spawn(process.execPath, args, { cwd: apiDir, env: { PATH: process.env.PATH ?? '', ...env } })
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
  const find = (msg: string) => logs().find(line => line.msg === msg)

  async function waitFor(msg: string) {
    while (!messages().includes(msg)) {
      if (child.exitCode !== null)
        throw new Error(`exited before "${msg}": ${stderr}`)
      await new Promise(resolve => setTimeout(resolve, 20))
    }
  }

  return { child, exited, logs, messages, find, waitFor, output: () => stdout + stderr }
}

const env = (role: string) => ({ ROLE: role, PORT: '0', DATABASE_URL, DATABASE_URL_UNPOOLED: DATABASE_URL })

describe('[E1.8] main: the ROLE switch and process lifecycle', () => {
  it('[E1.8] ROLE=api serves /healthz on HOST and starts no worker, and SIGTERM stops it with exit code 0', async () => {
    const run = start({ ...env('api'), HOST: '127.0.0.1' })
    await run.waitFor('started')
    const listening = run.find('api listening')
    const response = await fetch(`http://127.0.0.1:${listening?.port}/healthz`)

    expect(listening?.address).toBe('127.0.0.1')
    expect(response.status).toBe(200)
    expect(run.messages()).not.toContain('worker started')

    run.child.kill('SIGTERM')
    expect(await run.exited).toBe(0)
    expect(run.messages()).toEqual(['api listening', 'started', 'request', 'shutting down', 'api stopped', 'stopped'])
  })

  it('[E1.8] ROLE=worker starts only the worker, and SIGTERM stops it with exit code 0', async () => {
    const run = start(env('worker'))
    await run.waitFor('started')

    run.child.kill('SIGTERM')
    expect(await run.exited).toBe(0)
    expect(run.messages()).toEqual(['worker started', 'started', 'shutting down', 'worker stopped', 'stopped'])
  })

  it('[E1.8] ROLE=all starts the API on 0.0.0.0 and the worker in one process, and SIGINT stops the API before the worker', async () => {
    const run = start(env('all'))
    await run.waitFor('started')

    expect(run.find('started')?.role).toBe('all')
    expect(run.find('api listening')?.address).toBe('0.0.0.0')

    run.child.kill('SIGINT')
    expect(await run.exited).toBe(0)
    expect(run.messages()).toEqual(['api listening', 'worker started', 'started', 'shutting down', 'api stopped', 'worker stopped', 'stopped'])
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

  it('[E1.8] a port already in use is a fatal startup failure logged through pino, with exit code 1', async () => {
    const blocker = createServer()
    blockers.add(blocker)
    await new Promise<void>(resolve => blocker.listen(0, '127.0.0.1', resolve))
    const { port } = blocker.address() as AddressInfo
    const run = start({ ...env('all'), HOST: '127.0.0.1', PORT: String(port) })

    expect(await run.exited).toBe(1)
    expect(run.find('startup failed')).toMatchObject({ level: 60, err: { code: 'EADDRINUSE' } })
    expect(run.messages()).not.toContain('worker started')
  })

  it.each([
    ['throw', 'uncaught exception'],
    ['reject', 'unhandled rejection'],
  ])('[E1.8] a crash (%s) logs a fatal line without the error message, shuts down and exits 1', async (crash, msg) => {
    const run = start({ ...env('all'), CRASH: crash }, 'crash-on-sigusr2.ts')
    await run.waitFor('started')

    run.child.kill('SIGUSR2')
    expect(await run.exited).toBe(1)
    expect(run.find(msg)).toMatchObject({ level: 60, err: { type: 'Error' } })
    expect(run.messages().slice(-4)).toEqual(['shutting down', 'api stopped', 'worker stopped', 'stopped'])
    expect(run.output()).not.toContain('anna@example.ch')
  })

  it('[E1.8] a stop that fails is logged, the worker still stops, and the process exits 1', async () => {
    const run = start(env('all'), 'http-close-fails.ts')
    await run.waitFor('started')

    run.child.kill('SIGTERM')
    expect(await run.exited).toBe(1)
    expect(run.messages().slice(-4)).toEqual(['shutting down', 'stop failed', 'worker stopped', 'stopped'])
  })
})
