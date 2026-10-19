import type { AddressInfo } from 'node:net'
import { serve } from '@hono/node-server'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { Hono } from 'hono'
import pg from 'pg'
import { fromDrizzle, PgBoss } from 'pg-boss'
import { z } from 'zod'
import { finish, productionBranchGuard, secret, tryEnv } from '../lib/env.ts'
import { dockerAvailable, withLocalPostgres } from '../lib/pg-docker.ts'
import { ms, percentile } from '../lib/stats.ts'

const SPIKE = 'SP3'
const SCHEMA = 'sp3_spike'
const CONCURRENCY = 50
const WARMUP_ROUNDS = 1
const MEASURED_ROUNDS = 5

const holds = pgSchema(SCHEMA).table('holds', {
  id: uuid('id').primaryKey().defaultRandom(),
  seatId: text('seat_id').notNull(),
  guestId: text('guest_id').notNull(),
  status: text('status').notNull(),
  holdUntil: timestamp('hold_until', { withTimezone: true }).notNull(),
})

const lines: { name: string; ok: boolean }[] = []
const check = (name: string, ok: boolean, note?: string) => {
  lines.push({ name, ok })
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${note ? ` (${note})` : ''}`)
}

async function suite(label: string, pooledUrl: string, directUrl: string, fromFlyFra: boolean | null): Promise<boolean> {
  console.log(`--- SP3 ${label} ---`)
  const admin = new pg.Pool({ connectionString: directUrl, max: 2 })
  await admin.query(`drop schema if exists ${SCHEMA} cascade`)
  await admin.query(`create schema ${SCHEMA}`)
  await admin.query(`create table ${SCHEMA}.holds (
    id uuid primary key default gen_random_uuid(),
    seat_id text not null,
    guest_id text not null,
    status text not null,
    hold_until timestamptz not null)`)
  await admin.query(`create unique index holds_one_pending_per_seat on ${SCHEMA}.holds (seat_id) where status = 'pending_payment'`)

  const boss = new PgBoss({ connectionString: directUrl, schema: SCHEMA })
  boss.on('error', (e) => console.error(`pg-boss error: ${e.message}`))
  await boss.start()
  await boss.createQueue('hold-expiry')

  const requestPool = new pg.Pool({ connectionString: pooledUrl, max: 20 })
  const db = drizzle(requestPool)

  const app = new Hono()
  app.post('/api/holds', async (c) => {
    const body = z.object({ seatId: z.string(), guestId: z.string() }).parse(await c.req.json())
    const holdUntil = new Date(Date.now() + 15 * 60_000)
    const created = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(holds)
        .values({ seatId: body.seatId, guestId: body.guestId, status: 'pending_payment', holdUntil })
        .onConflictDoNothing()
        .returning({ id: holds.id })
      const row = inserted[0]
      if (!row) return null
      await boss.send('hold-expiry', { holdId: row.id, seatId: body.seatId }, { startAfter: holdUntil, db: fromDrizzle(tx, sql) })
      return row.id
    })
    return created ? c.json({ id: created }, 201) : c.json({ title: 'Seat already held', status: 409 }, 409)
  })

  const server = await new Promise<{ base: string; close: () => Promise<void> }>((resolve) => {
    const s = serve({ fetch: app.fetch, port: 0, hostname: '127.0.0.1' }, (info: AddressInfo) =>
      resolve({ base: `http://127.0.0.1:${info.port}`, close: () => new Promise<void>((done) => s.close(() => done())) }),
    )
  })

  const latencies: number[] = []
  let allRoundsOk = true
  try {
    for (let round = 0; round < WARMUP_ROUNDS + MEASURED_ROUNDS; round++) {
      const seatId = `seat-${round}`
      const results = await Promise.all(
        Array.from({ length: CONCURRENCY }, async (_, i) => {
          const started = performance.now()
          const res = await fetch(`${server.base}/api/holds`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ seatId, guestId: `guest-${i}` }),
          })
          await res.arrayBuffer()
          return { status: res.status, ms: performance.now() - started }
        }),
      )
      const pending = Number(
        ((await admin.query(`select count(*) from ${SCHEMA}.holds where seat_id = $1 and status = 'pending_payment'`, [seatId])).rows[0] as { count: string }).count,
      )
      const jobs = Number(
        ((await admin.query(`select count(*) from ${SCHEMA}.job where name = 'hold-expiry' and data->>'seatId' = $1`, [seatId])).rows[0] as { count: string }).count,
      )
      const created = results.filter((r) => r.status === 201).length
      const conflicts = results.filter((r) => r.status === 409).length
      const other = results.length - created - conflicts
      const roundMs = results.map((r) => r.ms)
      const warm = round < WARMUP_ROUNDS
      if (!warm) latencies.push(...roundMs)
      const ok = pending === 1 && created === 1 && conflicts === CONCURRENCY - 1 && other === 0 && jobs === 1
      allRoundsOk &&= ok
      check(
        `${warm ? 'warm-up ' : ''}round ${round}: pending_payment=${pending} of ${CONCURRENCY} requests`,
        ok,
        `201=${created}, 409=${conflicts}, other=${other}, expiry jobs=${jobs}, p50 ${ms(percentile(roundMs, 50))}, p95 ${ms(percentile(roundMs, 95))}, max ${ms(Math.max(...roundMs))}`,
      )
    }
    const p50 = percentile(latencies, 50)
    const p95 = percentile(latencies, 95)
    console.log(`RECORDED p95 latency over ${latencies.length} measured requests: ${ms(p95)} (p50 ${ms(p50)}, p99 ${ms(percentile(latencies, 99))}, max ${ms(Math.max(...latencies))})`)
    if (fromFlyFra !== null) {
      check('requests were issued from a Fly fra machine (FLY_REGION=fra)', fromFlyFra)
    }
  } finally {
    await server.close()
    await boss.stop({ graceful: true, timeout: 5000 })
    await requestPool.end()
    await admin.query(`drop schema if exists ${SCHEMA} cascade`).catch(() => undefined)
    await admin.end()
  }
  return allRoundsOk && lines.every((l) => l.ok)
}

let localPass = false
let ranLocal = false
const missing: string[] = []
if (dockerAvailable()) {
  ranLocal = true
  localPass = await withLocalPostgres(async ({ url, version }) => {
    console.log(`LOCAL result: throwaway Docker postgres:17-alpine (server ${version}), container sk-spike-pg, pooled = direct = same local server (no PgBouncer, no network latency)`)
    return suite('LOCAL (Docker Postgres 17)', url, url, null)
  })
} else {
  console.log('SKIP SP3: missing docker')
  missing.push('docker')
}

const allowNonFly = process.env.SP3_ALLOW_NON_FLY === '1'
const onProduction = productionBranchGuard(SPIKE)
const remote = onProduction ? null : tryEnv(SPIKE, {
  DATABASE_URL: secret(),
  DATABASE_URL_UNPOOLED: secret(),
  FLY_REGION: allowNonFly ? z.string().optional() : z.string().min(1),
})
if (!remote && onProduction) missing.push('throwaway NEON_BRANCH')
else if (!remote) {
  for (const key of ['DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'FLY_REGION']) {
    if (!process.env[key]?.trim() && !(key === 'FLY_REGION' && allowNonFly)) missing.push(key)
  }
}
let remotePass: boolean | null = null
if (remote) {
  lines.length = 0
  const region = remote.FLY_REGION
  remotePass = await suite(
    `REMOTE (Neon pooled for requests, direct for pg-boss; FLY_REGION=${region ?? 'none, laptop run'})`,
    remote.DATABASE_URL,
    remote.DATABASE_URL_UNPOOLED,
    region === undefined ? null : region === 'fra',
  )
}

finish({
  spike: SPIKE,
  ran: ranLocal || Boolean(remote),
  scope: ranLocal && remote ? 'local+remote' : ranLocal ? 'local' : remote ? 'remote' : 'none',
  pass: ranLocal || remote ? (ranLocal ? localPass : true) && (remotePass ?? true) : null,
  missing,
})
