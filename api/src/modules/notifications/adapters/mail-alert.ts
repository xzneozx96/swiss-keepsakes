import type { Logger } from 'pino'
import type { MailAlert } from '../ports.ts'

// Until Sentry arrives (E2.9), the alert is one error line with a fixed event name (docs/ops/mail.md). The
// failure holds the mail id, the template, the attempts and the error code, never the address or the link.
export function createLogAlert(logger: Logger): MailAlert {
  return failure => logger.error({ event: 'mail.failed', ...failure }, 'mail failed after all retries')
}
