import process from 'node:process'
import { loadConfig } from './platform/config.ts'
import { createApp } from './platform/http/app.ts'
import { startHttpServer } from './platform/http/server.ts'
import { startWorker } from './platform/jobs/worker.ts'
import { createLogger } from './platform/logger.ts'

const loaded = loadConfig(process.env)
if (!loaded.ok) {
  process.stderr.write(`${loaded.message}\n`)
  process.exit(1)
}
const { config } = loaded
const logger = createLogger(config.LOG_LEVEL)
// Shutdown runs these in start order, so the API stops taking requests before the worker stops.
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
  if (config.ROLE !== 'worker') {
    const server = await startHttpServer(createApp(logger).fetch, config.HOST, config.PORT, logger)
    stops.push(server.close)
  }
  if (config.ROLE !== 'api')
    stops.push(startWorker(logger).stop)
  logger.info({ role: config.ROLE }, 'started')
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

process.on('uncaughtException', error => crash('uncaught exception', error))
process.on('unhandledRejection', reason => crash('unhandled rejection', reason))
main().catch(error => crash('startup failed', error))
