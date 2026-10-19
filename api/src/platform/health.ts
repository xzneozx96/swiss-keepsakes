import type { Pool } from 'pg'
import type { PgBoss } from 'pg-boss'
import type { Logger } from 'pino'
import os from 'node:os'
import process from 'node:process'
import { setTimeout as sleep } from 'node:timers/promises'
import { jobsSchema } from './jobs/boss.ts'

export interface HealthReport {
  database: boolean
  jobs: boolean
}

export type HealthCheck = () => Promise<HealthReport>

const checkTimeout = 2_000

async function noAnswer(signal: AbortSignal): Promise<never> {
  await sleep(checkTimeout, undefined, { signal })
  throw new Error(`no answer in ${checkTimeout} ms`)
}

// A database that hangs instead of refusing must still fail the check quickly.
async function passes(name: string, check: () => Promise<boolean>, logger: Logger): Promise<boolean> {
  const abort = new AbortController()
  try {
    return await Promise.race([check(), noAnswer(abort.signal)])
  }
  catch (error) {
    logger.warn({ err: error, check: name }, 'health check failed')
    return false
  }
  finally {
    abort.abort()
  }
}

// pg-boss records each instance with its host and pid, and getInstances() calls it live while it is not stopped
// and has beaten within three of its intervals (30 s each by default). getInstances() reads up to 1000 rows of
// every instance, so this reads only this process's rows, with the same rule.
const thisProcessIsLive = `
  select exists (
    select 1 from ${jobsSchema}.instance
     where host = $1 and pid = $2 and stopped_on is null
       and heartbeat_on >= ${jobsSchema}.job_now() - heartbeat_seconds * 3 * interval '1 second'
  ) as live`

// Architecture section 13: the database through the pooled connection request handlers use, and this
// process's pg-boss heartbeat, read over pg-boss's own direct connection.
export function createHealthCheck({ pool, boss, logger }: { pool: Pool, boss: PgBoss, logger: Logger }): HealthCheck {
  return async () => {
    const [database, jobs] = await Promise.all([
      passes('database', async () => {
        await pool.query('select 1')
        return true
      }, logger),
      passes('jobs', async () => {
        const { rows } = await boss.getDb().executeSql(thisProcessIsLive, [os.hostname(), process.pid])
        return rows[0]?.live === true
      }, logger),
    ])
    return { database, jobs }
  }
}
