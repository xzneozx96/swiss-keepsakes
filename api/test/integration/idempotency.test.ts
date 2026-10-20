import type { Jobs } from '../../src/platform/jobs/boss.ts'
import { randomUUID } from 'node:crypto'
import { setTimeout as sleep } from 'node:timers/promises'
import { createRoute, z } from '@hono/zod-openapi'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest'
import { createAuditLog } from '../../src/platform/audit.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { createApp } from '../../src/platform/http/app.ts'
import { idempotency } from '../../src/platform/http/idempotency.ts'
import { startJobs } from '../../src/platform/jobs/boss.ts'
import { createJobQueue } from '../../src/platform/jobs/queue.ts'
import { createLogger } from '../../src/platform/logger.ts'
import { noSessions } from '../support/identity.ts'
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
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().min(1),
            fail: z.enum(['in-transaction', 'after-commit']).optional(),
            respond: z.enum(['no-content', 'binary', 'with-headers']).optional(),
            units: z.enum(['two-in-sequence', 'two-at-once', 'nested']).optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: { description: 'Recorded', content: { 'application/json': { schema: z.object({ probeId: z.string(), name: z.string() }) } } },
    204: { description: 'Recorded, no body' },
    200: { description: 'Recorded, binary body', content: { 'application/octet-stream': { schema: z.any() } } },
  },
})

function latch() {
  let open = () => {}
  const opened = new Promise<void>((resolve) => {
    open = resolve
  })
  return { open, opened }
}

type PausePoint = 'in-transaction' | 'after-commit'

// Not valid UTF-8, so a text round trip would change it.
const binaryBody = new Uint8Array([0x00, 0xFF, 0xFE, 0x80, 0xC3, 0x28, 0x0A, 0x7F])

// The database the middleware sees. One that fails every update stands in for a database lost
// between the command's commit and storing its response.
const storingFails = new Proxy(db, {
  get: (target, property, receiver) => property === 'update'
    ? () => {
        throw new Error('database went away')
      }
    : Reflect.get(target, property, receiver),
})

// A command route the way a module will write one: it writes an audit row and a job in one unit of work.
// A test can make it fail, answer in another shape, or pause the next request inside the transaction or
// after the commit.
function setup({ storeFails = false } = {}) {
  const clock = createManualClock(new Date('2026-10-20T08:00:00Z'))
  const uow = createUnitOfWork(db)
  const audit = createAuditLog(clock)
  const jobQueue = createJobQueue(jobs.boss)
  const executions: string[] = []
  // lock_timeout as the command's own statements see it, after the claim.
  const lockTimeouts: (string | undefined)[] = []
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
  const app = createApp(createLogger('info', { write: line => logs.push(JSON.parse(line)) }), async () => ({ database: true, jobs: true }), noSessions)
  app.use('/api/*', idempotency({ db: storeFails ? storingFails : db, clock, actorId: c => c.req.header('X-Test-Actor') ?? 'anonymous' }))
  app.get('/api/probes', c => c.json({ ok: true }))
  app.openapi(probeRoute, async (c) => {
    const { name, fail, respond, units } = c.req.valid('json')
    const probeId = randomUUID()
    const unit = () => uow.run(async (tx) => {
      executions.push(name)
      const { rows } = await tx.execute<{ lock_timeout: string }>(sql`select current_setting('lock_timeout') as lock_timeout`)
      lockTimeouts.push(rows[0]?.lock_timeout)
      await audit.record(tx, { storeId: null, actor: 'system', entity: 'probe', entityId: probeId, action: 'recorded', after: { name }, requestId: c.get('requestId') })
      await jobQueue.send(tx, queue, { name })
      await holdIfPaused('in-transaction')
      if (fail === 'in-transaction')
        throw new Error('refused after writing')
      if (units === 'nested')
        await uow.run(async () => {})
    })
    if (units === 'two-at-once') {
      await Promise.all([unit(), unit()])
    }
    else {
      await unit()
      if (units === 'two-in-sequence')
        await unit()
    }
    await holdIfPaused('after-commit')
    if (fail === 'after-commit')
      throw new Error('failed after the commit')
    if (respond === 'no-content')
      return c.body(null, 204)
    if (respond === 'binary')
      return c.body(binaryBody, 200, { 'Content-Type': 'application/octet-stream' })
    if (respond === 'with-headers') {
      c.header('Set-Cookie', 'session=s3cret-session; HttpOnly')
      c.header('X-Custom-Token', 'tok_s3cret')
      c.header('Location', `/api/probes/${probeId}`)
      c.header('ETag', '"v1"')
    }
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
  const storedResponses = (key: string) => count(pool, 'select count(*) from platform.idempotency_keys where key = $1 and response is not null', [key])
  return { app, clock, logs, executions, lockTimeouts, send, pauseNext, written, keyRows, storedResponses }
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

  it('[E1.9] a 204 No Content answer replays as 204 with no body', async () => {
    const { send, executions } = setup()
    const key = unique('key')
    const name = unique('anna')

    const first = await send(key, { name, respond: 'no-content' })
    const again = await send(key, { name, respond: 'no-content' })

    expect(first.status).toBe(204)
    expect(again.status).toBe(204)
    expect(again.headers.get('Idempotent-Replayed')).toBe('true')
    expect(again.body).toBeNull()
    expect(executions).toEqual([name])
  })

  it('[E1.9] a binary body replays byte for byte', async () => {
    const { send } = setup()
    const key = unique('key')
    const name = unique('anna')

    const first = await send(key, { name, respond: 'binary' })
    const again = await send(key, { name, respond: 'binary' })

    expect(new Uint8Array(await first.arrayBuffer())).toEqual(binaryBody)
    expect(again.headers.get('Idempotent-Replayed')).toBe('true')
    expect(again.headers.get('Content-Type')).toBe('application/octet-stream')
    expect(new Uint8Array(await again.arrayBuffer())).toEqual(binaryBody)
  })

  it('[E1.9] a replay carries only the headers that describe the answer, never Set-Cookie or a custom header', async () => {
    const { send } = setup()
    const key = unique('key')
    const name = unique('anna')

    const first = await send(key, { name, respond: 'with-headers' })
    const again = await send(key, { name, respond: 'with-headers' })

    expect(first.headers.get('Set-Cookie')).toContain('s3cret-session')
    expect(again.headers.get('Idempotent-Replayed')).toBe('true')
    expect(again.headers.get('Location')).toBe(first.headers.get('Location'))
    expect(again.headers.get('ETag')).toBe('"v1"')
    expect(again.headers.get('Set-Cookie')).toBeNull()
    expect(again.headers.get('X-Custom-Token')).toBeNull()
    const { rows } = await pool.query<{ response: string }>('select response::text from platform.idempotency_keys where key = $1', [key])
    expect(rows[0]?.response).not.toMatch(/s3cret/)
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
    // Nothing of the 409 that onError made for the lost race carries over to the replay.
    expect(b.headers.get('Retry-After')).toBeNull()
    expect(b.headers.get('Content-Type')).toBe('application/json')
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

  it('[E1.9] a repeat whose claim waits more than 5 s on another open transaction gets 409, and the command runs once', async () => {
    const { send, executions, pauseNext } = setup()
    const key = unique('key')
    const name = unique('anna')
    const pause = pauseNext('in-transaction')

    const first = send(key, { name })
    await pause.reached.opened
    const started = performance.now()
    const second = await send(key, { name })
    const waited = performance.now() - started
    pause.release.open()

    expect(second.status).toBe(409)
    expect(await second.json()).toMatchObject({ type: 'idempotency-key-in-use' })
    expect(waited).toBeGreaterThanOrEqual(5_000)
    expect((await first).status).toBe(201)
    expect(executions).toEqual([name])
  })

  it('[E1.9] the claim\'s lock timeout ends with the claim, so the command\'s own statements wait on locks as usual', async () => {
    const { send, lockTimeouts } = setup()

    expect((await send(unique('key'), { name: unique('anna') })).status).toBe(201)
    expect(lockTimeouts).toEqual(['0'])
  })

  it('[E1.9] a uow.run nested in another fails at once instead of waiting on its own claim, and nothing is stored', async () => {
    const { send, logs, keyRows, written } = setup()
    const key = unique('key')
    const name = unique('anna')

    const response = await send(key, { name, units: 'nested' })

    expect(response.status).toBe(500)
    expect(logs).toContainEqual(expect.objectContaining({ msg: 'unhandled error', level: 50 }))
    expect(await keyRows(key)).toBe(0)
    expect(await written(name)).toEqual({ audit: 0, jobs: 0 })
  })

  it('[E1.9] two units of work at once in one command: the second is refused, and the answer is stored once the first commits', async () => {
    const { send, executions, written, storedResponses } = setup()
    const key = unique('key')
    const name = unique('anna')

    const first = await send(key, { name, units: 'two-at-once' })
    const again = await send(key, { name, units: 'two-at-once' })

    expect(first.status).toBe(500)
    expect(executions).toEqual([name])
    expect(await written(name)).toEqual({ audit: 1, jobs: 1 })
    expect(await storedResponses(key)).toBe(1)
    expect(again.status).toBe(500)
    expect(again.headers.get('Idempotent-Replayed')).toBe('true')
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

  it('[E1.9] another actor\'s answer for the same key never overwrites this actor\'s stored answer', async () => {
    const { send } = setup()
    const key = unique('key')
    const [anna, bruno] = [unique('anna'), unique('bruno')]

    const annaFirst = await (await send(key, { name: anna }, { 'X-Test-Actor': 'user-a' })).text()
    await send(key, { name: bruno }, { 'X-Test-Actor': 'user-b' })
    const annaAgain = await send(key, { name: anna }, { 'X-Test-Actor': 'user-a' })

    expect(annaAgain.headers.get('Idempotent-Replayed')).toBe('true')
    expect(await annaAgain.text()).toBe(annaFirst)
  })

  it('[E1.9] a command with two units of work in sequence claims the key once, with the first, and replays', async () => {
    const { send, executions, written } = setup()
    const key = unique('key')
    const name = unique('anna')

    const first = await send(key, { name, units: 'two-in-sequence' })
    const again = await send(key, { name, units: 'two-in-sequence' })

    expect(first.status).toBe(201)
    expect(again.headers.get('Idempotent-Replayed')).toBe('true')
    expect(executions).toEqual([name, name])
    expect(await written(name)).toEqual({ audit: 2, jobs: 2 })
  })

  it('[E1.9] a command body over 1 MiB is refused with 413 before the middleware reads it, so nothing runs or is stored', async () => {
    const { send, executions, keyRows } = setup()
    const key = unique('key')

    const response = await send(key, { name: 'x'.repeat(1024 * 1024) })

    expect(response.status).toBe(413)
    expect(await response.json()).toMatchObject({ type: 'body-too-large' })
    expect(executions).toEqual([])
    expect(await keyRows(key)).toBe(0)
  })

  it('[E1.9] reads under /api/* need no Idempotency-Key', async () => {
    const { app } = setup()
    const response = await app.request('/api/probes')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })
})
