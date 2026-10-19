import { describe, expect, it } from 'vitest'
import { createLogger } from '../../src/platform/logger.ts'

function capture() {
  const lines: string[] = []
  return { logger: createLogger('info', { write: line => lines.push(line) }), lines }
}

// The shape of a node-postgres DatabaseError: its message and `detail` quote the row that failed.
class DatabaseError extends Error {
  code = '23505'
  constraint = 'guests_email_key'
  table = 'guests'
  detail = 'Key (email)=(anna@example.ch) already exists.'
}

describe('[E1.8] logger', () => {
  it('[E1.8] writes JSON and redacts emails, phone numbers, tokens and engraving text at each covered depth', () => {
    const { logger, lines } = capture()

    logger.info({
      orderId: 'ord_1',
      email: 'guest@example.ch',
      token: 'partner-token-1',
      engraving: 'For Anna, 1990',
      guest: { name: 'Anna', email: 'anna@example.ch', phone: '+41 79 000 00 00', phoneNumber: '+41 79 111 11 11' },
      headers: { Authorization: 'Bearer eyJ.upper', cookie: 'session=abc' },
      req: { headers: { authorization: 'Bearer eyJ.lower', Cookie: 'session=def' } },
      guests: [{ guestEmail: 'ben@example.ch', engravingText: 'Ben 2001' }],
      order: { guests: [{ email: 'cara@example.ch' }] },
      session: { accessToken: 'at-1', refreshToken: 'rt-1', password: 'pw-1' },
    }, 'order accepted')

    expect(lines).toHaveLength(1)
    const line = lines[0] ?? ''
    for (const secret of ['guest@example.ch', 'partner-token-1', 'For Anna', 'anna@example.ch', '+41 79', 'eyJ.', 'session=', 'ben@example.ch', 'Ben 2001', 'cara@example.ch', 'at-1', 'rt-1', 'pw-1'])
      expect(line).not.toContain(secret)
    expect(JSON.parse(line)).toMatchObject({
      msg: 'order accepted',
      orderId: 'ord_1',
      guest: { name: 'Anna', email: '[redacted]', phone: '[redacted]', phoneNumber: '[redacted]' },
      req: { headers: { authorization: '[redacted]', Cookie: '[redacted]' } },
      guests: [{ guestEmail: '[redacted]', engravingText: '[redacted]' }],
    })
  })

  it('[E1.8] logs an error by an allow-list: type, code, constraint, table and stack frames, never the message or other fields', () => {
    const { logger, lines } = capture()
    const database = new DatabaseError('duplicate key value violates unique constraint, params: anna@example.ch,For Anna')
    const wrapped = new Error('Failed query: insert into guests (email, engraving) values ($1, $2) params: anna@example.ch,For Anna', { cause: database })

    logger.error({ err: wrapped }, 'unhandled error')

    const line = lines[0] ?? ''
    expect(line).not.toContain('anna@example.ch')
    expect(line).not.toContain('For Anna')
    expect(line).not.toContain('Failed query')
    const { err } = JSON.parse(line) as { err: { type: string, stack: string, cause: Record<string, unknown> } }
    expect(err).toMatchObject({ type: 'Error', cause: { type: 'DatabaseError', code: '23505', constraint: 'guests_email_key', table: 'guests' } })
    expect(err.stack).toMatch(/^\s+at /)
    expect(Object.keys(err.cause)).not.toContain('detail')
  })

  it('[E1.8] logs a thrown non-Error value by its type only', () => {
    const { logger, lines } = capture()

    logger.error({ err: 'anna@example.ch' }, 'unhandled error')

    expect(JSON.parse(lines[0] ?? '')).toMatchObject({ err: { type: 'string' } })
    expect(lines[0]).not.toContain('anna@example.ch')
  })
})
