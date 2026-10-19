import process from 'node:process'
import { loadConfig } from './platform/config.ts'
import { createPool } from './platform/db/client.ts'
import { createHealthCheck } from './platform/health.ts'
import { createApp } from './platform/http/app.ts'
import { startHttpServer } from './platform/http/server.ts'
import { startJobs } from './platform/jobs/boss.ts'
import { createLogger } from './platform/logger.ts'

const loaded = loadConfig(process.env)
if (!loaded.ok) {
  process.stderr.write(`${loaded.message}\n`)
  process.exit(1)
}
const { config } = loaded
const logger = createLogger(config.LOG_LEVEL)
// Each start puts its stop first, so shutdown runs in reverse start order: the API stops taking requests,
// then pg-boss stops, then the database pool closes.
const stops: (() => Promise<void>)[] = []

let stopping = false
async function shutdown(reason: string) {
  if (stopping)
    return
  stopping = true
  logger.info({ reason }, 'shutting down')
  // Exit anyway if a connection or a job never finishes.
  setTimeout(() => {
    logger.error('shutdown timed out')
    process.exit(1)
  }, 10_000).unref()
  for (const stop of stops) {
    try {
      await stop()
    }
    catch (error) {
      logger.error({ err: error }, 'stop failed')
      process.exitCode = 1
    }
  }
  logger.info('stopped')
}

function crash(message: string, error: unknown) {
  logger.fatal({ err: error }, message)
  process.exitCode = 1
  void shutdown(message)
}

async function main() {
  const pool = createPool(config.DATABASE_URL, logger)
  stops.unshift(() => pool.end())
  const jobs = await startJobs(config.DATABASE_URL_UNPOOLED, config.ROLE !== 'api', logger)
  stops.unshift(jobs.stop)
  if (config.ROLE !== 'worker') {
    const checkHealth = createHealthCheck({ pool, boss: jobs.boss, logger })
    const server = await startHttpServer(createApp(logger, checkHealth).fetch, config.HOST, config.PORT, logger)
    stops.unshift(server.close)
  }
  logger.info({ role: config.ROLE }, 'started')
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

process.on('uncaughtException', error => crash('uncaught exception', error))
process.on('unhandledRejection', reason => crash('unhandled rejection', reason))
main().catch(error => crash('startup failed', error))
