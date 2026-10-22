import os from 'node:os'
import process from 'node:process'
import { afterAll, describe, expect, inject, it } from 'vitest'
import { createPool } from '../../src/platform/db/client.ts'
import { createHealthCheck } from '../../src/platform/health.ts'
import { createApp } from '../../src/platform/http/app.ts'
import { startJobs } from '../../src/platform/jobs/boss.ts'
import { noCommands } from '../support/commands.ts'
import { noSessions } from '../support/identity.ts'
import { openTestDatabase, silentLogger } from './support.ts'

const { pool } = openTestDatabase()

afterAll(() => pool.end())

// Each test starts and stops its own pg-boss, so no other instance of this process looks live.
async function healthz(target: { pool: typeof pool, jobsStopped?: boolean }) {
  const jobs = await startJobs(inject('databaseUrlUnpooled'), false, silentLogger)
  try {
    if (target.jobsStopped)
      await jobs.boss.stop({ close: false })
    const app = createApp(silentLogger, createHealthCheck({ pool: target.pool, boss: jobs.boss, logger: silentLogger }), noSessions, noCommands)
    const response = await app.request('/healthz')
    return { status: response.status, body: await response.json() }
  }
  finally {
    await jobs.stop()
  }
}

// Live pg-boss rows of other machines, started an hour ago. Without `pid`, each gets its own.
async function otherMachines(howMany: number, pid?: number) {
  await pool.query(`
    insert into pgboss.instance (id, host, pid, version, node_version, heartbeat_seconds, supervise, schedule, migrate, persist_queue_stats, persist_warnings, started_on)
    select gen_random_uuid(), 'other-machine-e1-9', coalesce($2, g), '12.38.0', 'v22.20.0', 30, false, false, false, false, false, now() - interval '1 hour'
      from generate_series(1, $1::int) g`, [howMany, pid ?? null])
}

describe('[E1.9] /healthz checks the database and the pg-boss heartbeat', () => {
  it('[E1.9] answers 200 when the pooled database answers and this process\'s pg-boss instance is live', async () => {
    expect(await healthz({ pool })).toEqual({ status: 200, body: { status: 'ok' } })
  })

  it('[E1.9] answers 503 with database failed when the pooled connection is refused', async () => {
    const unreachable = createPool('postgres://postgres@127.0.0.1:1/swiss_keepsakes', silentLogger)
    const result = await healthz({ pool: unreachable })
    await unreachable.end()

    expect(result).toMatchObject({ status: 503, body: { type: 'unhealthy', checks: { database: 'failed', jobs: 'ok' } } })
  })

  it('[E1.9] answers 503 with jobs failed when this process\'s pg-boss instance has stopped, even if another machine runs a live one with the same pid', async () => {
    await otherMachines(1, process.pid)
    try {
      expect(await healthz({ pool, jobsStopped: true })).toMatchObject({ status: 503, body: { checks: { database: 'ok', jobs: 'failed' } } })
    }
    finally {
      await pool.query(`delete from pgboss.instance where host = 'other-machine-e1-9'`)
    }
  })

  it('[E1.9] does not count a row of this host and pid that has not beaten for three intervals, as a crashed life leaves it', async () => {
    const { rows: [crashed] } = await pool.query<{ id: string }>(`
      insert into pgboss.instance (id, host, pid, version, node_version, heartbeat_seconds, supervise, schedule, migrate, persist_queue_stats, persist_warnings, started_on, heartbeat_on)
      values (gen_random_uuid(), $1, $2, '12.38.0', 'v22.20.0', 30, false, false, false, false, false, now() - interval '1 hour', now() - interval '91 seconds')
      returning id`, [os.hostname(), process.pid])
    try {
      expect(await healthz({ pool, jobsStopped: true })).toMatchObject({ status: 503, body: { checks: { jobs: 'failed' } } })
    }
    finally {
      await pool.query('delete from pgboss.instance where id = $1', [crashed?.id])
    }
  })

  it('[E1.9] finds this process\'s pg-boss row behind 1000 older live instances of other machines', async () => {
    // getInstances() returns the first 1000 rows by start time, so these alone would fill it.
    await otherMachines(1000)
    try {
      expect(await healthz({ pool })).toEqual({ status: 200, body: { status: 'ok' } })
    }
    finally {
      await pool.query(`delete from pgboss.instance where host = 'other-machine-e1-9'`)
    }
  })
})
