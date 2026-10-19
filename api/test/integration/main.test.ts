import type { AddressInfo, Server } from 'node:net'
import { createServer } from 'node:net'
import { afterEach, describe, expect, inject, it } from 'vitest'
import { startMain } from '../support/process.ts'

const blockers = new Set<Server>()

afterEach(() => {
  for (const blocker of blockers) blocker.close()
  blockers.clear()
})

const env = (role: string) => ({ ROLE: role, PORT: '0', DATABASE_URL: inject('databaseUrl'), DATABASE_URL_UNPOOLED: inject('databaseUrlUnpooled') })

describe('[E1.8] main: the ROLE switch and process lifecycle', () => {
  it('[E1.8] ROLE=api serves /healthz on HOST and runs pg-boss without a worker, and SIGTERM stops it with exit code 0', async () => {
    const run = startMain({ ...env('api'), HOST: '127.0.0.1' })
    await run.waitFor('started')
    const listening = run.find('api listening')
    const response = await fetch(`http://127.0.0.1:${listening?.port}/healthz`)

    expect(listening?.address).toBe('127.0.0.1')
    expect(response.status).toBe(200)
    expect(run.find('jobs started')?.worker).toBe(false)

    run.child.kill('SIGTERM')
    expect(await run.exited).toBe(0)
    expect(run.messages()).toEqual(['jobs started', 'api listening', 'started', 'request', 'shutting down', 'api stopped', 'jobs stopped', 'stopped'])
  })

  it('[E1.8] ROLE=worker starts only pg-boss as a worker, with no HTTP server, and SIGTERM stops it with exit code 0', async () => {
    const run = startMain(env('worker'))
    await run.waitFor('started')

    expect(run.find('jobs started')?.worker).toBe(true)
    run.child.kill('SIGTERM')
    expect(await run.exited).toBe(0)
    expect(run.messages()).toEqual(['jobs started', 'started', 'shutting down', 'jobs stopped', 'stopped'])
  })

  it('[E1.8] ROLE=all starts the API on 0.0.0.0 and the worker in one process, and SIGINT stops the API before pg-boss', async () => {
    const run = startMain(env('all'))
    await run.waitFor('started')

    expect(run.find('started')?.role).toBe('all')
    expect(run.find('api listening')?.address).toBe('0.0.0.0')
    expect(run.find('jobs started')?.worker).toBe(true)

    run.child.kill('SIGINT')
    expect(await run.exited).toBe(0)
    expect(run.messages()).toEqual(['jobs started', 'api listening', 'started', 'shutting down', 'api stopped', 'jobs stopped', 'stopped'])
  })

  it('[E1.8] a port already in use is a fatal startup failure logged through pino, with exit code 1', async () => {
    const blocker = createServer()
    blockers.add(blocker)
    await new Promise<void>(resolve => blocker.listen(0, '127.0.0.1', resolve))
    const { port } = blocker.address() as AddressInfo
    const run = startMain({ ...env('all'), HOST: '127.0.0.1', PORT: String(port) })

    expect(await run.exited).toBe(1)
    expect(run.find('startup failed')).toMatchObject({ level: 60, err: { code: 'EADDRINUSE' } })
    expect(run.messages().slice(-2)).toEqual(['jobs stopped', 'stopped'])
  })

  it.each([
    ['throw', 'uncaught exception'],
    ['reject', 'unhandled rejection'],
  ])('[E1.8] a crash (%s) logs a fatal line without the error message, shuts down and exits 1', async (crash, msg) => {
    const run = startMain({ ...env('all'), CRASH: crash }, 'crash-on-sigusr2.ts')
    await run.waitFor('started')

    run.child.kill('SIGUSR2')
    expect(await run.exited).toBe(1)
    expect(run.find(msg)).toMatchObject({ level: 60, err: { type: 'Error' } })
    expect(run.messages().slice(-4)).toEqual(['shutting down', 'api stopped', 'jobs stopped', 'stopped'])
    expect(run.output()).not.toContain('anna@example.ch')
  })

  it('[E1.8] a stop that fails is logged, pg-boss still stops, and the process exits 1', async () => {
    const run = startMain(env('all'), 'http-close-fails.ts')
    await run.waitFor('started')

    run.child.kill('SIGTERM')
    expect(await run.exited).toBe(1)
    expect(run.messages().slice(-4)).toEqual(['shutting down', 'stop failed', 'jobs stopped', 'stopped'])
  })
})
