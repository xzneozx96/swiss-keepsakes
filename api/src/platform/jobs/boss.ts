import type { Logger } from 'pino'
import { PgBoss } from 'pg-boss'

export interface Jobs {
  boss: PgBoss
  stop: () => Promise<void>
}

// Every role starts pg-boss, because sending a job needs a started instance. Only a worker supervises
// (expiry, retention, maintenance) and runs schedules. pg-boss uses the direct connection (D2), and
// `migrate: false` because its schema is installed by the release command (db/migrate.ts).
export async function startJobs(directUrl: string, worker: boolean, logger: Logger): Promise<Jobs> {
  const boss = new PgBoss({ connectionString: directUrl, connectionTimeoutMillis: 5_000, migrate: false, supervise: worker, schedule: worker })
  // pg-boss reports failed polls and heartbeats here, and an 'error' event with no listener ends the process.
  boss.on('error', error => logger.error({ err: error }, 'pg-boss error'))
  await boss.start()
  logger.info({ worker }, 'jobs started')
  return {
    boss,
    async stop() {
      // Under the 10 s shutdown limit in main.ts.
      await boss.stop({ timeout: 5_000 })
      logger.info('jobs stopped')
    },
  }
}
