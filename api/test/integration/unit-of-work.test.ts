import type { AuditLog } from '../../src/platform/audit.ts'
import type { Clock } from '../../src/platform/clock.ts'
import type { UnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import type { JobQueue } from '../../src/platform/jobs/queue.ts'
import { randomUUID } from 'node:crypto'
import { setTimeout as sleep } from 'node:timers/promises'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest'
import { createAuditLog } from '../../src/platform/audit.ts'
import { createDatabase, createPool } from '../../src/platform/db/client.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { startJobs } from '../../src/platform/jobs/boss.ts'
import { createJobQueue } from '../../src/platform/jobs/queue.ts'
import { createLogger } from '../../src/platform/logger.ts'
import { createWebhookEvents } from '../../src/platform/webhooks.ts'
import { createManualClock } from '../support/manual-clock.ts'
import { count, openTestDatabase, silentLogger } from './support.ts'

const queue = 'e1-9-probe'
const { pool, db } = openTestDatabase()
let jobs: Awaited<ReturnType<typeof startJobs>>

beforeAll(async () => {
  jobs = await startJobs(inject('databaseUrlUnpooled'), false, silentLogger)
  await jobs.boss.createQueue(queue)
})

afterAll(async () => {
  await jobs.stop()
  await pool.end()
})

// A use case written the way architecture 4.1 asks: a factory over ports, generic over the transaction
// type, with no Drizzle in sight. It fails after writing when asked to.
function makeRecordProbe<T>({ uow, audit, queue: jobQueue, clock }: { uow: UnitOfWork<T>, audit: AuditLog<T>, queue: JobQueue<T>, clock: Clock }) {
  return (probeId: string, failAfterWriting: boolean) => uow.run(async (tx) => {
    await audit.record(tx, { storeId: null, actor: 'system', entity: 'probe', entityId: probeId, action: 'recorded', after: { probeId }, requestId: null })
    await jobQueue.send(tx, queue, { probeId }, { startAfter: new Date(clock.now().getTime() + 60_000) })
    if (failAfterWriting)
      throw new Error('refused after writing')
    return probeId
  })
}

function setup() {
  const clock = createManualClock(new Date('2026-10-20T08:00:00Z'))
  const recordProbe = makeRecordProbe({ uow: createUnitOfWork(db), audit: createAuditLog(clock), queue: createJobQueue(jobs.boss), clock })
  const auditRows = (probeId: string) => count(pool, 'select count(*) from platform.audit_log where entity_id = $1', [probeId])
  const jobRows = (probeId: string) => count(pool, `select count(*) from pgboss.job where name = $1 and data->>'probeId' = $2`, [queue, probeId])
  return { clock, recordProbe, auditRows, jobRows }
}

describe('[E1.9] unit of work: the business write, the audit row and the job commit together', () => {
  it('[E1.9] a rolled-back command leaves no audit row and no job', async () => {
    const { recordProbe, auditRows, jobRows } = setup()
    const probeId = randomUUID()

    await expect(recordProbe(probeId, true)).rejects.toThrow('refused after writing')

    expect(await auditRows(probeId)).toBe(0)
    expect(await jobRows(probeId)).toBe(0)
  })

  it('[E1.9] a committed command leaves exactly one audit row and one job, timed by the injected clock', async () => {
    const { clock, recordProbe, auditRows, jobRows } = setup()
    const probeId = randomUUID()

    await recordProbe(probeId, false)

    expect(await auditRows(probeId)).toBe(1)
    expect(await jobRows(probeId)).toBe(1)
    const { rows: [audit] } = await pool.query('select actor, action, after, at from platform.audit_log where entity_id = $1', [probeId])
    expect(audit).toEqual({ actor: 'system', action: 'recorded', after: { probeId }, at: clock.now() })
    const { rows: [job] } = await pool.query(`select start_after from pgboss.job where data->>'probeId' = $1`, [probeId])
    expect(job.start_after).toEqual(new Date('2026-10-20T08:01:00Z'))
  })
})

describe('[E1.9] a lost database connection', () => {
  it('[E1.9] a connection killed in the middle of a unit of work rejects uow.run and is logged, and the process carries on', async () => {
    const logs: { level: number, msg: string }[] = []
    const lossyPool = createPool(inject('databaseUrl'), createLogger('info', { write: line => logs.push(JSON.parse(line)) }))
    const uow = createUnitOfWork(createDatabase(lossyPool))
    try {
      const run = uow.run(async (tx) => {
        const { rows } = await tx.execute<{ pid: number }>(sql`select pg_backend_pid() as pid`)
        await pool.query('select pg_terminate_backend($1)', [rows[0]?.pid])
        // The client sees the termination while it is checked out and idle in the transaction.
        await sleep(200)
        await tx.execute(sql`select 1`)
      })

      await expect(run).rejects.toThrow()
      expect(logs).toContainEqual(expect.objectContaining({ level: 50, msg: 'database connection error' }))
      // An unhandled 'error' event would have failed this run. The pool also replaced the dead connection.
      expect(await uow.run(async tx => (await tx.execute(sql`select 1 as one`)).rows)).toEqual([{ one: 1 }])
    }
    finally {
      await lossyPool.end()
    }
  })
})

describe('[E1.9] webhook_events deduplication', () => {
  it('[E1.9] a repeated (provider, event_id) inserts nothing and reports a duplicate', async () => {
    const clock = createManualClock(new Date('2026-10-20T09:00:00Z'))
    const events = createWebhookEvents(clock)
    const eventId = `evt_${randomUUID()}`
    const record = (payload: object) => db.transaction(tx => events.record(tx, { provider: 'stripe', eventId, payload }))

    expect(await record({ attempt: 1 })).toBe('recorded')
    clock.advance(5_000)
    expect(await record({ attempt: 2 })).toBe('duplicate')

    const { rows } = await pool.query('select payload, received_at from platform.webhook_events where event_id = $1', [eventId])
    expect(rows).toEqual([{ payload: { attempt: 1 }, received_at: new Date('2026-10-20T09:00:00Z') }])
  })

  it('[E1.9] the same event id from another provider is a separate event', async () => {
    const events = createWebhookEvents(createManualClock(new Date('2026-10-20T09:00:00Z')))
    const eventId = `evt_${randomUUID()}`

    expect(await db.transaction(tx => events.record(tx, { provider: 'stripe', eventId, payload: {} }))).toBe('recorded')
    expect(await db.transaction(tx => events.record(tx, { provider: 'other', eventId, payload: {} }))).toBe('recorded')
  })
})

describe('[E1.9] units of work do not nest', () => {
  it('[E1.9] uow.run inside another uow.run rejects with a clear error, and the outer transaction rolls back', async () => {
    const uow = createUnitOfWork(db)
    const probeId = randomUUID()

    await expect(uow.run(async (tx) => {
      await createAuditLog(createManualClock(new Date())).record(tx, { storeId: null, actor: 'system', entity: 'probe', entityId: probeId, action: 'recorded', requestId: null })
      await uow.run(async () => {})
    })).rejects.toThrow('uow.run was called inside another uow.run')
    expect(await count(pool, 'select count(*) from platform.audit_log where entity_id = $1', [probeId])).toBe(0)
  })
})
