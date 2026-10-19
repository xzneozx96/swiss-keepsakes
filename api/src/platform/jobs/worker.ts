import type { Logger } from 'pino'

export interface Worker {
  stop: () => Promise<void>
}

export function startWorker(logger: Logger): Worker {
  // With no queue attached, nothing else keeps a worker-only process alive.
  const keepAlive = setInterval(() => {}, 2 ** 31 - 1)
  logger.info('worker started')
  return {
    async stop() {
      clearInterval(keepAlive)
      logger.info('worker stopped')
    },
  }
}
