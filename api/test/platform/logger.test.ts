import { describe, expect, it } from 'vitest'
import { createLogger } from '../../src/platform/logger.ts'

describe('[E1.8] logger', () => {
  it('[E1.8] writes JSON and redacts emails, phone numbers, tokens and engraving text', () => {
    const lines: string[] = []
    const logger = createLogger('info', { write: line => lines.push(line) })

    logger.info({
      orderId: 'ord_1',
      email: 'guest@example.ch',
      token: 'partner-token-1',
      engraving: 'For Anna, 1990',
      guest: { name: 'Anna', email: 'anna@example.ch', phone: '+41 79 000 00 00' },
      headers: { authorization: 'Bearer eyJ.secret', cookie: 'session=abc' },
      session: { accessToken: 'at-1' },
    }, 'order accepted')

    expect(lines).toHaveLength(1)
    const line = lines[0] ?? ''
    for (const secret of ['guest@example.ch', 'partner-token-1', 'For Anna', 'anna@example.ch', '+41 79', 'eyJ.secret', 'session=abc', 'at-1'])
      expect(line).not.toContain(secret)
    expect(JSON.parse(line)).toMatchObject({
      msg: 'order accepted',
      orderId: 'ord_1',
      email: '[redacted]',
      guest: { name: 'Anna', email: '[redacted]', phone: '[redacted]' },
      headers: { authorization: '[redacted]', cookie: '[redacted]' },
    })
  })
})
