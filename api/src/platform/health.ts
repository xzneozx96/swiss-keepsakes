import type { Pool } from 'pg'
import type { PgBoss } from 'pg-boss'
import type { Logger } from 'pino'
import os from 'node:os'
import process from 'node:process'
import { setTimeout as sleep } from 'node:timers/promises'

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

// Architecture section 13: the database through the pooled connection request handlers use, and this
// process's pg-boss heartbeat. pg-boss records each instance with its host and pid, and calls it live while
// it is not stopped and has beaten within three intervals (30 s each by default).
export function createHealthCheck({ pool, boss, logger }: { pool: Pool, boss: PgBoss, logger: Logger }): HealthCheck {
  return async () => {
    const [database, jobs] = await Promise.all([
      passes('database', async () => {
        await pool.query('select 1')
        return true
      }, logger),
      passes('jobs', async () => {
        const instances = await boss.getInstances()
        return instances.some(instance => instance.host === os.hostname() && instance.pid === process.pid && instance.live)
      }, logger),
    ])
    return { database, jobs }
  }
}
