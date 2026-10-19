import process from 'node:process'
import { loadConfig } from './platform/config.ts'
import { createApp } from './platform/http/app.ts'
import { startHttpServer } from './platform/http/server.ts'
import { startWorker } from './platform/jobs/worker.ts'
import { createLogger } from './platform/logger.ts'

async function main() {
  const loaded = loadConfig(process.env)
  if (!loaded.ok) {
    process.stderr.write(`${loaded.message}\n`)
    process.exit(1)
  }
  const { config } = loaded
  const logger = createLogger(config.LOG_LEVEL)
  const stops: (() => Promise<void>)[] = []

  try {
    if (config.ROLE !== 'worker') {
      const server = await startHttpServer(createApp(logger).fetch, config.PORT, logger)
      stops.push(server.close)
    }
    if (config.ROLE !== 'api')
      stops.push(startWorker(logger).stop)
  }
  catch (error) {
    logger.fatal({ err: error }, 'startup failed')
    process.exit(1)
  }
  logger.info({ role: config.ROLE }, 'started')

  let stopping = false
  async function shutdown(signal: NodeJS.Signals) {
    if (stopping)
      return
    stopping = true
    logger.info({ signal }, 'shutting down')
    // Exit anyway if a connection or a job never finishes.
    setTimeout(() => {
      logger.error('shutdown timed out')
      process.exit(1)
    }, 10_000).unref()
    await Promise.all(stops.map(stop => stop()))
    logger.info('stopped')
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main()
