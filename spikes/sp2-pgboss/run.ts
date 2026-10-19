import { spawn, type ChildProcess } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import { pgSchema, text, timestamp } from 'drizzle-orm/pg-core'
import pg from 'pg'
import { fromDrizzle, PgBoss } from 'pg-boss'
import { finish, secret, tryEnv } from '../lib/env.ts'
import { dockerAvailable, withLocalPostgres } from '../lib/pg-docker.ts'
import { ms } from '../lib/stats.ts'

const SPIKE = 'SP2'
const SCHEMA = 'sp2_spike'
const BUDGET_MS = 5000
const worker = fileURLToPath(new URL('./worker.ts', import.meta.url))

const app = pgSchema(SCHEMA)
const holds = app.table('holds', {
  id: text('id').primaryKey(),
  holdUntil: timestamp('hold_until', { withTimezone: true }).notNull(),
})

const lines: { name: string; ok: boolean; note?: string }[] = []
const check = (name: string, ok: boolean, note?: string) => {
  lines.push({ name, ok, note })
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${note ? ` (${note})` : ''}`)
}
const sleep = (n: number) => new Promise((r) => setTimeout(r, n))

interface RunRow {
  queue: string
  job_id: string
  proc: string
  delay_ms: string | null
}

async function waitFor(pool: pg.Pool, queue: string, atLeast: number, timeoutMs: number): Promise<number> {
  const deadline = Date.now() + timeoutMs
  let count = 0
  while (Date.now() < deadline) {
    count = Number(((await pool.query(`select count(*) from ${SCHEMA}.runs where queue = $1`, [queue])).rows[0] as { count: string }).count)
    if (count >= atLeast) return count
    await sleep(500)
  }
  return count
}

async function enqueueDeferred(boss: PgBoss, db: ReturnType<typeof drizzle>, queue: string, count: number, firstInMs: number, gapMs: number) {
  const deadlines: Date[] = []
  for (let i = 0; i < count; i++) {
    const deadline = new Date(Date.now() + firstInMs + i * gapMs)
    const holdId = `hold-${Date.now()}-${i}`
    await db.transaction(async (tx) => {
      await tx.insert(holds).values({ id: holdId, holdUntil: deadline })
      await boss.send(queue, { holdId, deadline: deadline.toISOString() }, { startAfter: deadline, db: fromDrizzle(tx, sql) })
    })
    deadlines.push(deadline)
  }
  return deadlines
}

function delayStats(rows: RunRow[]) {
  const delays = rows.map((r) => Number(r.delay_ms))
  return { min: Math.min(...delays), max: Math.max(...delays), avg: delays.reduce((a, b) => a + b, 0) / delays.length }
}

async function suite(label: string, url: string): Promise<boolean> {
  console.log(`--- SP2 ${label} ---`)
  const pool = new pg.Pool({ connectionString: url, max: 4 })
  await pool.query(`drop schema if exists ${SCHEMA} cascade`)
  await pool.query(`create schema ${SCHEMA}`)
  await pool.query(`create table ${SCHEMA}.holds (id text primary key, hold_until timestamptz not null)`)
  await pool.query(
    `create table ${SCHEMA}.runs (queue text not null, job_id text not null, proc text not null, fired_at timestamptz not null, deadline timestamptz)`,
  )
  const db = drizzle(pool)
  const children: ChildProcess[] = []
  try {
    const delays = async (queue: string): Promise<RunRow[]> =>
      (
        await pool.query(
          `select queue, job_id, proc, extract(epoch from (fired_at - deadline)) * 1000 as delay_ms from ${SCHEMA}.runs where queue = $1 order by fired_at`,
          [queue],
        )
      ).rows as RunRow[]

    const boss = new PgBoss({ connectionString: url, schema: SCHEMA, supervise: false, schedule: false })
    boss.on('error', (e) => console.error(`pg-boss error: ${e.message}`))
    await boss.start()
    await boss.createQueue('hold-expiry')
    const sendOnly = boss

    const rollbackId = `rolled-back-${Date.now()}`
    try {
      await db.transaction(async (tx) => {
        await tx.insert(holds).values({ id: rollbackId, holdUntil: new Date(Date.now() + 1000) })
        await sendOnly.send('hold-expiry', { holdId: rollbackId, deadline: new Date().toISOString() }, { startAfter: 1, db: fromDrizzle(tx, sql) })
        throw new Error('forced rollback')
      })
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'forced rollback') throw error
    }
    const rolledJobs = Number(
      ((await pool.query(`select count(*) from ${SCHEMA}.job where name = 'hold-expiry' and data->>'holdId' = $1`, [rollbackId])).rows[0] as { count: string }).count,
    )
    const rolledHolds = Number(((await pool.query(`select count(*) from ${SCHEMA}.holds where id = $1`, [rollbackId])).rows[0] as { count: string }).count)
    check('rolled-back transaction enqueues no pg-boss job', rolledJobs === 0, `jobs=${rolledJobs}`)
    check('rolled-back transaction leaves no hold row', rolledHolds === 0, `holds=${rolledHolds}`)

    await sendOnly.createQueue('hold-expiry-default')
    const spike = new PgBoss({ connectionString: url, schema: SCHEMA })
    spike.on('error', (e) => console.error(`pg-boss error: ${e.message}`))
    await spike.start()
    const handler = (queue: string) => async (jobs: { id: string; data: { holdId: string; deadline: string } }[]) => {
      for (const job of jobs) {
        await pool.query(`insert into ${SCHEMA}.runs (queue, job_id, proc, fired_at, deadline) values ($1, $2, 'single', now(), $3)`, [queue, job.id, job.data.deadline])
      }
    }
    await spike.work<{ holdId: string; deadline: string }>('hold-expiry', { batchSize: 10 }, handler('hold-expiry'))
    await spike.work<{ holdId: string; deadline: string }>('hold-expiry-default', handler('hold-expiry-default'))

    await enqueueDeferred(sendOnly, db, 'hold-expiry-default', 1, 6000, 0)
    await enqueueDeferred(sendOnly, db, 'hold-expiry-default', 6, 10000, 0)
    await enqueueDeferred(sendOnly, db, 'hold-expiry', 4, 6000, 2500)
    await enqueueDeferred(sendOnly, db, 'hold-expiry', 10, 6000, 0)
    const firedRecommended = await waitFor(pool, 'hold-expiry', 14, 60000)
    const firedDefault = await waitFor(pool, 'hold-expiry-default', 7, 60000)
    await spike.stop({ graceful: true, timeout: 5000 })
    const recommended = await delays('hold-expiry')
    const defaults = await delays('hold-expiry-default')
    const nan = { min: Number.NaN, max: Number.NaN, avg: Number.NaN }
    const recStats = recommended.length > 0 ? delayStats(recommended) : nan
    const lone = defaults.slice(0, 1)
    const loneStats = lone.length > 0 ? delayStats(lone) : nan
    const burst = defaults.slice(1)
    const burstStats = burst.length > 0 ? delayStats(burst) : nan
    check('4 spread + 10 same-deadline jobs fired once each (batchSize 10, polling 2 s)', firedRecommended === 14 && new Set(recommended.map((r) => r.job_id)).size === 14, `fired=${firedRecommended}`)
    check(
      `fire delay within ${BUDGET_MS} ms of hold_until (batchSize 10, polling 2 s)`,
      recommended.length === 14 && recStats.max <= BUDGET_MS && recStats.min >= 0,
      `min ${ms(recStats.min)}, avg ${ms(recStats.avg)}, max ${ms(recStats.max)}`,
    )
    check(
      `lone job on pg-boss defaults (batchSize 1, polling 2 s) within ${BUDGET_MS} ms`,
      lone.length === 1 && loneStats.max <= BUDGET_MS && loneStats.min >= 0,
      `delay ${ms(loneStats.max)}`,
    )
    console.log(
      `info ${firedDefault - 1} same-deadline jobs on defaults (batchSize 1): min ${ms(burstStats.min)}, avg ${ms(burstStats.avg)}, max ${ms(burstStats.max)} (one job per poll, so the queue drains serially)`,
    )
    await pool.query(`delete from ${SCHEMA}.runs`)

    for (const name of ['A', 'B']) {
      const child = spawn(process.execPath, ['--import', 'tsx', worker, name], {
        env: { ...process.env, SP2_CHILD_DB_URL: url, SP2_SCHEMA: SCHEMA },
        stdio: ['ignore', 'pipe', 'inherit'],
        cwd: fileURLToPath(new URL('..', import.meta.url)),
      })
      children.push(child)
    }
    await Promise.all(
      children.map(
        (child) =>
          new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('worker not ready in 30 s')), 30000)
            child.stdout?.on('data', (d: Buffer) => {
              if (d.toString().includes('READY')) {
                clearTimeout(timer)
                resolve()
              }
            })
          }),
      ),
    )

    const m = 10
    await enqueueDeferred(sendOnly, db, 'hold-expiry', m, 8000, 300)
    const firedTwo = await waitFor(pool, 'hold-expiry', m, 40000)
    await sleep(3000)
    const two = await delays('hold-expiry')
    const twoStats = two.length > 0 ? delayStats(two) : { min: Number.NaN, max: Number.NaN, avg: Number.NaN }
    const perProc = two.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.proc]: (acc[r.proc] ?? 0) + 1 }), {})
    check(`each of ${m} deferred jobs ran exactly once across two ROLE=all style processes`, two.length === m && new Set(two.map((r) => r.job_id)).size === m && firedTwo === m, `runs=${two.length}, per process ${JSON.stringify(perProc)}`)
    check(`fire delay within ${BUDGET_MS} ms with two processes`, two.length === m && twoStats.max <= BUDGET_MS && twoStats.min >= 0, `min ${ms(twoStats.min)}, avg ${ms(twoStats.avg)}, max ${ms(twoStats.max)}`)

    console.log('waiting for two cron-minute ticks (up to 135 s)')
    await waitFor(pool, 'cron-minute', 2, 135000)
    await sleep(2000)
    for (const child of children) child.kill('SIGTERM')
    await Promise.all(children.map((c) => new Promise<void>((r) => (c.exitCode !== null ? r() : c.once('exit', () => r())))))
    children.length = 0

    for (const [queue, atLeast] of [['cron-rrule', 0], ['cron-minute', 2]] as const) {
      const rows = (await pool.query(`select job_id, proc from ${SCHEMA}.runs where queue = $1`, [queue])).rows as { job_id: string; proc: string }[]
      const distinct = new Set(rows.map((r) => r.job_id)).size
      const dupSlots = Number(
        ((await pool.query(`select count(*) from (select start_after from ${SCHEMA}.job where name = $1 group by start_after having count(*) > 1) d`, [queue])).rows[0] as { count: string }).count,
      )
      const procs = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.proc]: (acc[r.proc] ?? 0) + 1 }), {})
      check(
        `cron ${queue}: every tick ran once across two processes`,
        rows.length >= atLeast && rows.length === distinct && dupSlots === 0,
        `runs=${rows.length}, distinct jobs=${distinct}, duplicate slots=${dupSlots}, per process ${JSON.stringify(procs)}`,
      )
    }
    await sendOnly.stop({ graceful: true, timeout: 5000 })
  } finally {
    for (const child of children) child.kill('SIGKILL')
    await pool.query(`drop schema if exists ${SCHEMA} cascade`).catch(() => undefined)
    await pool.end()
  }
  return lines.every((l) => l.ok)
}

let localPass = false
let ranLocal = false
const missing: string[] = []
if (dockerAvailable()) {
  ranLocal = true
  localPass = await withLocalPostgres(async ({ url, version }) => {
    console.log(`LOCAL result: throwaway Docker postgres:17-alpine (server ${version}), container sk-spike-pg`)
    return suite('LOCAL (Docker Postgres 17)', url)
  })
} else {
  console.log('SKIP SP2: missing docker')
  missing.push('docker')
}

const remote = tryEnv(SPIKE, { DATABASE_URL_DIRECT: secret() })
if (!remote) missing.push('DATABASE_URL_DIRECT')
let remotePass: boolean | null = null
if (remote) {
  lines.length = 0
  remotePass = await suite('REMOTE (Neon direct connection)', remote.DATABASE_URL_DIRECT)
}

const pass = ranLocal || remote ? (ranLocal ? localPass : true) && (remotePass ?? true) : null
finish({
  spike: SPIKE,
  ran: ranLocal || Boolean(remote),
  scope: ranLocal && remote ? 'local+remote' : ranLocal ? 'local' : remote ? 'remote' : 'none',
  pass,
  missing,
})
