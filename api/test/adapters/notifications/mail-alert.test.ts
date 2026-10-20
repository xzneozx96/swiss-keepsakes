import { describe, expect, it } from 'vitest'
import { createLogAlert } from '../../../src/modules/notifications/adapters/mail-alert.ts'
import { createLogger } from '../../../src/platform/logger.ts'

describe('[E2.8] the mail alert', () => {
  it('[E2.8] is one error line with the fixed event mail.failed, the mail id, template, attempts and last error', () => {
    const lines: string[] = []
    const alert = createLogAlert(createLogger('info', { write: line => lines.push(line) }))

    alert({ mailId: '0192f3a0-0000-7000-8000-0000000000dd', template: 'N20', attempts: 6, lastError: 'EAUTH 535' })

    expect(lines.map(line => JSON.parse(line))).toEqual([expect.objectContaining({
      level: 50,
      event: 'mail.failed',
      msg: 'mail failed after all retries',
      mailId: '0192f3a0-0000-7000-8000-0000000000dd',
      template: 'N20',
      attempts: 6,
      lastError: 'EAUTH 535',
    })])
  })
})
