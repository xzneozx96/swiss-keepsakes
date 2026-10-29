import type { Logger } from 'pino'
import type { MailLog } from '../ports.ts'

// One line per attempt, so the terminal shows what became of each mail. The fields are the mail id, the template,
// the attempt number and the SMTP reply line or the error code, never the address, the body or a link
// (docs/ops/mail.md). The reply line holds the server's queue id, not the recipient.
export function createMailLog(logger: Logger): MailLog {
  return {
    sent: attempt => logger.info({ event: 'mail.sent', ...attempt }, 'mail sent'),
    retry: attempt => logger.warn({ event: 'mail.retry', ...attempt }, 'mail attempt failed and will be retried'),
  }
}
