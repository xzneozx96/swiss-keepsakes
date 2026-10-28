import type { Logger } from 'pino'
import type { MediaAlert } from '../ports.ts'

// Until Sentry arrives (E2.9), the alert is one error line with a fixed event name. It holds ids only.
export function createMediaLogAlert(logger: Logger): MediaAlert {
  return failure => logger.error({ event: 'media.failed', ...failure }, 'media processing failed and will not be retried')
}
