import process from 'node:process'
import { createMailQueues, startMailWorkers } from './modules/notifications/adapters/jobs.ts'
import { createLogAlert } from './modules/notifications/adapters/mail-alert.ts'
import { createSentMailRepository } from './modules/notifications/adapters/sent-mail-repository.ts'
import { createSmtpMailer, createUnconfiguredMailer } from './modules/notifications/adapters/smtp-mailer.ts'
import { makeFailMail } from './modules/notifications/application/fail-mail.ts'
import { makeSendMail } from './modules/notifications/application/send-mail.ts'
import { systemClock } from './platform/clock.ts'
import { loadConfig } from './platform/config.ts'
import { createDatabase, createPool } from './platform/db/client.ts'
import { createUnitOfWork } from './platform/db/unit-of-work.ts'
import { createHealthCheck } from './platform/health.ts'
import { createApp } from './platform/http/app.ts'
import { startHttpServer } from './platform/http/server.ts'
import { startJobs } from './platform/jobs/boss.ts'
import { createLogger } from './platform/logger.ts'
import { createSmtpTransport } from './platform/mail.ts'

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
  const uow = createUnitOfWork(createDatabase(pool))
  await createMailQueues(jobs.boss)
  if (config.ROLE !== 'api') {
    const sentMail = createSentMailRepository()
    if (!config.smtp)
      logger.warn({ event: 'mail.smtp-unset' }, 'SMTP_* is not set: every mail fails and retries until it is')
    const mailer = config.smtp ? createSmtpMailer(createSmtpTransport(config.smtp), config.smtp.from) : createUnconfiguredMailer(logger)
    await startMailWorkers(jobs.boss, {
      sendMail: makeSendMail({ uow, sentMail, mailer, clock: systemClock }),
      failMail: makeFailMail({ uow, sentMail, clock: systemClock, alert: createLogAlert(logger) }),
    })
  }
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
