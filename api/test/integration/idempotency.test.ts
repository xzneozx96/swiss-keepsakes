import type { Jobs } from '../../src/platform/jobs/boss.ts'
import { randomUUID } from 'node:crypto'
import { setTimeout as sleep } from 'node:timers/promises'
import { createRoute, z } from '@hono/zod-openapi'
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest'
import { createAuditLog } from '../../src/platform/audit.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { createApp } from '../../src/platform/http/app.ts'
import { idempotency } from '../../src/platform/http/idempotency.ts'
import { startJobs } from '../../src/platform/jobs/boss.ts'
import { createJobQueue } from '../../src/platform/jobs/queue.ts'
import { createLogger } from '../../src/platform/logger.ts'
import { createManualClock } from '../support/manual-clock.ts'
import { count, openTestDatabase, silentLogger } from './support.ts'

const queue = 'e1-9-command'
const day = 24 * 60 * 60 * 1000
const { pool, db } = openTestDatabase()
let jobs: Jobs

beforeAll(async () => {
  jobs = await startJobs(inject('databaseUrlUnpooled'), false, silentLogger)
  await jobs.boss.createQueue(queue)
})

afterAll(async () => {
  await jobs.stop()
  await pool.end()
})

const probeRoute = createRoute({
  method: 'post',
  path: '/api/probes',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: z.object({ name: z.string().min(1), fail: z.enum(['in-transaction', 'after-commit']).optional() }) } },
    },
  },
  responses: { 201: { description: 'Recorded', content: { 'application/json': { schema: z.object({ probeId: z.string(), name: z.string() }) } } } },
})

function latch() {
  let open = () => {}
  const opened = new Promise<void>((resolve) => {
    open = resolve
  })
  return { open, opened }
}

type PausePoint = 'in-transaction' | 'after-commit'

// A command route the way a module will write one: it writes an audit row and a job in one unit of work.
// A test can make it fail, or pause the next request at a point, inside the transaction or after the commit.
// The database the middleware sees. One that fails every update stands in for a database lost
// between the command's commit and storing its response.
const storingFails = new Proxy(db, {
  get: (target, property, receiver) => property === 'update'
    ? () => {
        throw new Error('database went away')
      }
    : Reflect.get(target, property, receiver),
})

function setup({ storeFails = false } = {}) {
  const clock = createManualClock(new Date('2026-10-20T08:00:00Z'))
  const uow = createUnitOfWork(db)
  const audit = createAuditLog(clock)
  const jobQueue = createJobQueue(jobs.boss)
  const executions: string[] = []
  let pause: { at: PausePoint, reached: ReturnType<typeof latch>, release: ReturnType<typeof latch> } | undefined
  const holdIfPaused = async (at: PausePoint) => {
    if (pause?.at !== at)
      return
    const { reached, release } = pause
    pause = undefined
    reached.open()
    await release.opened
  }

  const logs: { level: number, msg: string }[] = []
  const app = createApp(createLogger('info', { write: line => logs.push(JSON.parse(line)) }), async () => ({ database: true, jobs: true }))
  app.use('/api/*', idempotency({ db: storeFails ? storingFails : db, clock, actorId: c => c.req.header('X-Test-Actor') ?? 'anonymous' }))
  app.openapi(probeRoute, async (c) => {
    const { name, fail } = c.req.valid('json')
    const probeId = randomUUID()
    await uow.run(async (tx) => {
      executions.push(name)
      await audit.record(tx, { storeId: null, actor: 'system', entity: 'probe', entityId: probeId, action: 'recorded', after: { name }, requestId: c.get('requestId') })
      await jobQueue.send(tx, queue, { name })
      await holdIfPaused('in-transaction')
      if (fail === 'in-transaction')
        throw new Error('refused after writing')
    })
    await holdIfPaused('after-commit')
    if (fail === 'after-commit')
      throw new Error('failed after the commit')
    return c.json({ probeId, name }, 201)
  })

  const send = (key: string | undefined, body: object, headers: Record<string, string> = {}) => app.request('/api/probes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}), ...headers },
    body: JSON.stringify(body),
  })
  const pauseNext = (at: PausePoint) => {
    pause = { at, reached: latch(), release: latch() }
    return pause
  }
  const written = async (name: string) => ({
    audit: await count(pool, `select count(*) from platform.audit_log where entity = 'probe' and after->>'name' = $1`, [name]),
    jobs: await count(pool, `select count(*) from pgboss.job where name = $1 and data->>'name' = $2`, [queue, name]),
  })
  const keyRows = (key: string) => count(pool, 'select count(*) from platform.idempotency_keys where key = $1', [key])
  return { app, clock, logs, executions, send, pauseNext, written, keyRows }
}

async function waitForLockWait() {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await count(pool, `select count(*) from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock'`) > 0)
      return
    await sleep(20)
  }
  throw new Error('no backend waited on a lock')
}

const unique = (label: string) => `${label}-${randomUUID()}`

describe('[E1.9] Idempotency-Key', () => {
  it('[E1.9] a repeated key with the same body replays the first response and does not run the command again', async () => {
    const { send, executions, written } = setup()
    const key = unique('key')
    const name = unique('anna')

    const first = await send(key, { name })
    const firstBody = await first.text()
    const again = await send(key, { name })

    expect(first.status).toBe(201)
    expect(again.status).toBe(201)
    expect(await again.text()).toBe(firstBody)
    expect(again.headers.get('Content-Type')).toBe(first.headers.get('Content-Type'))
    expect(again.headers.get('Idempotent-Replayed')).toBe('true')
    expect(first.headers.get('Idempotent-Replayed')).toBeNull()
    expect(again.headers.get('X-Request-Id')).not.toBe(first.headers.get('X-Request-Id'))
    expect(executions).toEqual([name])
    expect(await written(name)).toEqual({ audit: 1, jobs: 1 })
  })

  it('[E1.9] the same key with a different body gets 422 problem+json, and the command does not run', async () => {
    const { send, executions } = setup()
    const key = unique('key')
    const name = unique('anna')
    await send(key, { name })

    const changed = await send(key, { name: `${name}-changed` })

    expect(changed.status).toBe(422)
    expect(changed.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await changed.json()).toMatchObject({ type: 'idempotency-key-reused', status: 422, instance: '/api/probes' })
    expect(executions).toEqual([name])
  })

  it('[E1.9] a command without an Idempotency-Key, or with a malformed one, is a 400 problem and does not run', async () => {
    const { send, executions } = setup()

    for (const key of [undefined, 'has spaces', 'k'.repeat(256)]) {
      const response = await send(key, { name: unique('anna') })
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ type: 'idempotency-key-required', status: 400 })
    }
    expect(executions).toEqual([])
  })

  it('[E1.9] the audit row carries the server request id of the request that ran', async () => {
    const { send } = setup()
    const name = unique('anna')

    const response = await send(unique('key'), { name }, { 'X-Request-Id': 'client-chosen-id' })

    const { rows } = await pool.query(`select request_id from platform.audit_log where after->>'name' = $1`, [name])
    expect(rows).toEqual([{ request_id: response.headers.get('X-Request-Id') }])
  })

  it('[E1.9] a command that rolls back leaves no key, no audit row and no job, so the same key and body run again', async () => {
    const { send, executions, written, keyRows } = setup()
    const key = unique('key')
    const name = unique('anna')

    const failed = await send(key, { name, fail: 'in-transaction' })

    expect(failed.status).toBe(500)
    expect(await keyRows(key)).toBe(0)
    expect(await written(name)).toEqual({ audit: 0, jobs: 0 })

    const retried = await send(key, { name, fail: 'in-transaction' })
    expect(retried.status).toBe(500)
    expect(executions).toEqual([name, name])
  })

  it('[E1.9] a failure after the commit is stored and replayed, so a committed command never runs twice', async () => {
    const { send, executions, written } = setup()
    const key = unique('key')
    const name = unique('anna')

    const failed = await send(key, { name, fail: 'after-commit' })
    const failedBody = await failed.text()
    const again = await send(key, { name, fail: 'after-commit' })

    expect(failed.status).toBe(500)
    expect(again.status).toBe(500)
    expect(await again.text()).toBe(failedBody)
    expect(executions).toEqual([name])
    expect(await written(name)).toEqual({ audit: 1, jobs: 1 })
  })

  it('[E1.9] a request that fails validation is not stored, so the corrected body runs with the same key', async () => {
    const { send, executions, keyRows } = setup()
    const key = unique('key')
    const name = unique('anna')

    const invalid = await send(key, { name: '' })
    const corrected = await send(key, { name })

    expect(invalid.status).toBe(400)
    expect(await invalid.json()).toMatchObject({ type: 'validation-failed' })
    expect(corrected.status).toBe(201)
    expect(executions).toEqual([name])
    expect(await keyRows(key)).toBe(1)
  })

  it('[E1.9] two concurrent requests with one key run the command once, and both get the first response', async () => {
    const { send, logs, executions, written, pauseNext } = setup()
    const key = unique('key')
    const name = unique('anna')
    const pause = pauseNext('in-transaction')

    const first = send(key, { name })
    await pause.reached.opened
    // The second request passes the first lookup, because the claim is not committed yet. Its own claim
    // then waits on the unique key until the first transaction ends.
    const second = send(key, { name })
    await waitForLockWait()
    pause.release.open()
    const [a, b] = await Promise.all([first, second])

    expect([a.status, b.status]).toEqual([201, 201])
    expect(await b.text()).toBe(await a.text())
    expect(b.headers.get('Idempotent-Replayed')).toBe('true')
    expect(executions).toEqual([name])
    expect(await written(name)).toEqual({ audit: 1, jobs: 1 })
    // The lost race is an expected answer, not an error to alert on.
    expect(logs.filter(line => line.level >= 50)).toEqual([])
  })

  it('[E1.9] a repeat while the first request has committed but not answered waits, then gets 409 with Retry-After', async () => {
    const { send, executions, pauseNext } = setup()
    const key = unique('key')
    const name = unique('anna')
    const pause = pauseNext('after-commit')

    const first = send(key, { name })
    await pause.reached.opened
    const second = await send(key, { name })

    expect(second.status).toBe(409)
    expect(second.headers.get('Retry-After')).toBe('1')
    expect(await second.json()).toMatchObject({ type: 'idempotency-key-in-use', status: 409 })

    pause.release.open()
    expect((await first).status).toBe(201)
    expect((await send(key, { name })).headers.get('Idempotent-Replayed')).toBe('true')
    expect(executions).toEqual([name])
  })

  it('[E1.9] when the response cannot be stored, the client still gets it, and a repeat gets 409 instead of running again', async () => {
    const { send, logs, executions } = setup({ storeFails: true })
    const key = unique('key')
    const name = unique('anna')

    const first = await send(key, { name })
    const again = await send(key, { name })

    expect(first.status).toBe(201)
    expect(logs).toContainEqual(expect.objectContaining({ level: 50, msg: 'idempotent response not stored' }))
    expect(again.status).toBe(409)
    expect(executions).toEqual([name])
  })

  it('[E1.9] a key is replayed for 24 hours by the injected clock, and runs again once it has expired', async () => {
    const { send, clock, executions } = setup()
    const key = unique('key')
    const name = unique('anna')
    await send(key, { name })

    clock.advance(day - 1)
    expect((await send(key, { name })).headers.get('Idempotent-Replayed')).toBe('true')
    clock.advance(1)
    const afterExpiry = await send(key, { name })

    expect(afterExpiry.status).toBe(201)
    expect(afterExpiry.headers.get('Idempotent-Replayed')).toBeNull()
    expect(executions).toEqual([name, name])
  })

  it('[E1.9] keys belong to one actor: another actor with the same key runs its own command', async () => {
    const { send, executions } = setup()
    const key = unique('key')
    const name = unique('anna')

    await send(key, { name }, { 'X-Test-Actor': 'user-a' })
    const other = await send(key, { name }, { 'X-Test-Actor': 'user-b' })

    expect(other.headers.get('Idempotent-Replayed')).toBeNull()
    expect(executions).toEqual([name, name])
  })

  it('[E1.9] reads are not affected', async () => {
    const { app } = setup()

    expect((await app.request('/healthz')).status).toBe(200)
  })
})
