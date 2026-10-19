import { afterAll, describe, expect, inject, it } from 'vitest'
import { createPool } from '../../src/platform/db/client.ts'
import { createHealthCheck } from '../../src/platform/health.ts'
import { createApp } from '../../src/platform/http/app.ts'
import { startJobs } from '../../src/platform/jobs/boss.ts'
import { openTestDatabase, silentLogger } from './support.ts'

const { pool } = openTestDatabase()

afterAll(() => pool.end())

// Each test starts and stops its own pg-boss, so no other instance of this process looks live.
async function healthz(target: { pool: typeof pool, jobsStopped?: boolean }) {
  const jobs = await startJobs(inject('databaseUrlUnpooled'), false, silentLogger)
  try {
    if (target.jobsStopped)
      await jobs.boss.stop({ close: false })
    const app = createApp(silentLogger, createHealthCheck({ pool: target.pool, boss: jobs.boss, logger: silentLogger }))
    const response = await app.request('/healthz')
    return { status: response.status, body: await response.json() }
  }
  finally {
    await jobs.stop()
  }
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

  it('[E1.9] answers 503 with jobs failed when this process\'s pg-boss instance has stopped', async () => {
    expect(await healthz({ pool, jobsStopped: true })).toMatchObject({ status: 503, body: { checks: { database: 'ok', jobs: 'failed' } } })
  })
})
