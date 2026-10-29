import type { Logger } from 'pino'
import type { MediaAlert } from '../ports.ts'

// Until Sentry arrives (E2.9), the alert is one error line with a fixed event name. It holds ids only.
// A failed file that a story or tour uses is a different event: no retry helps, the merchant must replace the file.
export function createMediaLogAlert(logger: Logger): MediaAlert {
  return ({ storeId, mediaId, inUse }) => inUse
    ? logger.error({ event: 'media.failed-in-use', storeId, mediaId }, 'media processing failed for a file in use: the merchant must replace the file')
    : logger.error({ event: 'media.failed', storeId, mediaId }, 'media processing failed and will not be retried')
}
