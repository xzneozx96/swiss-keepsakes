import { describe, expect, it } from 'vitest'
import { loadConfig } from '../../src/platform/config.ts'

const DATABASE_URL = 'postgres://postgres@127.0.0.1:5433/swiss_keepsakes'

function failure(env: Record<string, string | undefined>): string {
  const result = loadConfig(env)
  if (result.ok)
    throw new Error('expected the environment to be rejected')
  return result.message
}

describe('[E1.8] config: one Zod schema read at startup', () => {
  it('[E1.8] accepts a complete environment and coerces PORT to a number', () => {
    expect(loadConfig({ ROLE: 'api', PORT: '8080', LOG_LEVEL: 'debug', DATABASE_URL, UNRELATED: 'x' })).toEqual({
      ok: true,
      config: { ROLE: 'api', PORT: 8080, LOG_LEVEL: 'debug', DATABASE_URL },
    })
  })

  it('[E1.8] defaults ROLE to all, PORT to 3000 and LOG_LEVEL to info, and treats blank values as unset', () => {
    expect(loadConfig({ DATABASE_URL, ROLE: ' ', PORT: '' })).toEqual({
      ok: true,
      config: { ROLE: 'all', PORT: 3000, LOG_LEVEL: 'info', DATABASE_URL },
    })
  })

  it.each(['api', 'worker', 'all'])('[E1.8] accepts ROLE=%s', (role) => {
    expect(loadConfig({ ROLE: role, DATABASE_URL })).toMatchObject({ ok: true, config: { ROLE: role } })
  })

  it('[E1.8] reports a missing DATABASE_URL as required', () => {
    expect(failure({ ROLE: 'api' })).toBe([
      'Invalid environment, the service did not start:',
      '  DATABASE_URL: Required',
      'Values are never printed.',
    ].join('\n'))
  })

  it('[E1.8] lists every bad variable in one message', () => {
    const message = failure({ ROLE: 'both', PORT: 'eighty', LOG_LEVEL: 'loud', DATABASE_URL })

    expect(message).toMatch(/^ {2}ROLE: .*"api"\|"worker"\|"all"/m)
    expect(message).toMatch(/^ {2}PORT: /m)
    expect(message).toMatch(/^ {2}LOG_LEVEL: /m)
    expect(message).not.toMatch(/DATABASE_URL/)
  })

  it('[E1.8] rejects a PORT outside 0 to 65535 and a fractional PORT', () => {
    expect(failure({ PORT: '70000', DATABASE_URL })).toMatch(/^ {2}PORT: /m)
    expect(failure({ PORT: '80.5', DATABASE_URL })).toMatch(/^ {2}PORT: /m)
  })

  it('[E1.8] rejects a DATABASE_URL that is not postgres without printing the value', () => {
    const message = failure({ DATABASE_URL: 'mysql://admin:s3cret-pw@db.example/sk', ROLE: 'hunter2' })

    expect(message).toContain('  DATABASE_URL: Expected a postgres:// or postgresql:// URL')
    expect(message).toMatch(/^ {2}ROLE: /m)
    expect(message).not.toContain('s3cret-pw')
    expect(message).not.toContain('mysql://')
    expect(message).not.toContain('hunter2')
  })
})
