import { describe, expect, it } from 'vitest'
import { createMailLog } from '../../../src/modules/notifications/adapters/mail-log.ts'
import { createLogger } from '../../../src/platform/logger.ts'

const mailId = '0192f3a0-0000-7000-8000-0000000000dd'

describe('the mail log', () => {
  it('a sent mail is one info line with the fixed event mail.sent, the mail id, template, attempt and SMTP reply', () => {
    const lines: string[] = []
    const log = createMailLog(createLogger('info', { write: line => lines.push(line) }))

    log.sent({ mailId, template: 'N01', attempt: 1, response: '250 2.0.0 OK 1761811200 abc123 - gsmtp' })

    expect(lines.map(line => JSON.parse(line))).toEqual([expect.objectContaining({
      level: 30,
      event: 'mail.sent',
      msg: 'mail sent',
      mailId,
      template: 'N01',
      attempt: 1,
      response: '250 2.0.0 OK 1761811200 abc123 - gsmtp',
    })])
  })

  it('a failed attempt that will be retried is one warn line with the fixed event mail.retry, the attempt and the error', () => {
    const lines: string[] = []
    const log = createMailLog(createLogger('info', { write: line => lines.push(line) }))

    log.retry({ mailId, template: 'N20', attempt: 2, error: 'ETIMEDOUT' })

    expect(lines.map(line => JSON.parse(line))).toEqual([expect.objectContaining({
      level: 40,
      event: 'mail.retry',
      msg: 'mail attempt failed and will be retried',
      mailId,
      template: 'N20',
      attempt: 2,
      error: 'ETIMEDOUT',
    })])
  })
})
