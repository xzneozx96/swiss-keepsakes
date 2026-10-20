import { describe, expect, it } from 'vitest'
import { loadConfig } from '../../src/platform/config.ts'

const DATABASE_URL = 'postgres://postgres@127.0.0.1:5433/swiss_keepsakes'
const DATABASE_URL_UNPOOLED = 'postgres://postgres@127.0.0.1:5433/swiss_keepsakes?direct'
const NEON_AUTH_BASE_URL = 'https://ep-example.neonauth.eu-central-1.aws.neon.tech/neondb/auth'
const urls = { DATABASE_URL, DATABASE_URL_UNPOOLED, NEON_AUTH_BASE_URL }

function failure(env: Record<string, string | undefined>): string {
  const result = loadConfig(env)
  if (result.ok)
    throw new Error('expected the environment to be rejected')
  return result.message
}

describe('[E1.8] config: one Zod schema read at startup', () => {
  it('[E1.8] accepts a complete environment and turns PORT into a number', () => {
    expect(loadConfig({ ROLE: 'api', HOST: '127.0.0.1', PORT: '8080', LOG_LEVEL: 'debug', ...urls, UNRELATED: 'x' })).toEqual({
      ok: true,
      config: { ROLE: 'api', HOST: '127.0.0.1', PORT: 8080, LOG_LEVEL: 'debug', ...urls },
    })
  })

  it('[E1.8] defaults ROLE to all, HOST to 0.0.0.0, PORT to 3000 and LOG_LEVEL to info, and treats blank values as unset', () => {
    expect(loadConfig({ ...urls, ROLE: ' ', PORT: '' })).toEqual({
      ok: true,
      config: { ROLE: 'all', HOST: '0.0.0.0', PORT: 3000, LOG_LEVEL: 'info', ...urls },
    })
  })

  it.each(['api', 'worker', 'all'])('[E1.8] accepts ROLE=%s', (role) => {
    expect(loadConfig({ ROLE: role, ...urls })).toMatchObject({ ok: true, config: { ROLE: role } })
  })

  it.each(['0.0.0.0', '127.0.0.1', '::', 'localhost', 'fly-local-6pn'])('[E1.8] accepts HOST=%s', (host) => {
    expect(loadConfig({ HOST: host, ...urls })).toMatchObject({ ok: true, config: { HOST: host } })
  })

  it('[E1.9] reports a missing DATABASE_URL and DATABASE_URL_UNPOOLED as required', () => {
    expect(failure({ ROLE: 'api', NEON_AUTH_BASE_URL })).toBe([
      'Invalid environment, the service did not start:',
      '  DATABASE_URL: Required',
      '  DATABASE_URL_UNPOOLED: Required',
      'Values are never printed.',
    ].join('\n'))
  })

  it('[E1.9] requires DATABASE_URL_UNPOOLED in every role, because every role starts pg-boss', () => {
    for (const ROLE of ['api', 'worker', 'all'])
      expect(failure({ ROLE, DATABASE_URL, NEON_AUTH_BASE_URL })).toContain('  DATABASE_URL_UNPOOLED: Required')
  })

  it('[E1.8] lists every bad variable in one message', () => {
    const message = failure({ ROLE: 'both', HOST: 'not a host!', PORT: 'eighty', LOG_LEVEL: 'loud', ...urls })

    expect(message).toMatch(/^ {2}ROLE: .*"api"\|"worker"\|"all"/m)
    expect(message).toMatch(/^ {2}HOST: Expected an IP address or a hostname$/m)
    expect(message).toMatch(/^ {2}PORT: /m)
    expect(message).toMatch(/^ {2}LOG_LEVEL: /m)
    expect(message).not.toMatch(/DATABASE_URL/)
  })

  it.each(['70000', '80.5', '0x1F90', '1e3', '-1', ' 80'])('[E1.8] rejects PORT=%j', (port) => {
    expect(failure({ PORT: port, ...urls })).toContain('  PORT: Expected a whole number from 0 to 65535')
  })

  it('[E1.8] rejects a DATABASE_URL that is not postgres without printing the value', () => {
    const message = failure({ DATABASE_URL: 'mysql://admin:s3cret-pw@db.example/sk', DATABASE_URL_UNPOOLED, NEON_AUTH_BASE_URL, ROLE: 'hunter2' })

    expect(message).toContain('  DATABASE_URL: Expected a postgres:// or postgresql:// URL with a host')
    expect(message).toMatch(/^ {2}ROLE: /m)
    expect(message).not.toContain('s3cret-pw')
    expect(message).not.toContain('mysql://')
    expect(message).not.toContain('hunter2')
  })

  it('[E1.8] rejects a DATABASE_URL with no host', () => {
    expect(failure({ DATABASE_URL: 'postgres:///swiss_keepsakes', DATABASE_URL_UNPOOLED, NEON_AUTH_BASE_URL })).toContain('  DATABASE_URL: Expected a postgres:// or postgresql:// URL with a host')
  })

  it('[E1.9] checks DATABASE_URL_UNPOOLED like DATABASE_URL, without printing the value', () => {
    const message = failure({ DATABASE_URL, DATABASE_URL_UNPOOLED: 'mysql://admin:s3cret-pw@db.example/sk', NEON_AUTH_BASE_URL })

    expect(message).toContain('  DATABASE_URL_UNPOOLED: Expected a postgres:// or postgresql:// URL with a host')
    expect(message).not.toContain('s3cret-pw')
  })
})

describe('[E2.2] config: the Neon Auth URL', () => {
  it('[E2.2] requires NEON_AUTH_BASE_URL in every role', () => {
    for (const ROLE of ['api', 'worker', 'all'])
      expect(failure({ ROLE, DATABASE_URL, DATABASE_URL_UNPOOLED })).toBe(['Invalid environment, the service did not start:', '  NEON_AUTH_BASE_URL: Required', 'Values are never printed.'].join('\n'))
  })

  it.each([
    NEON_AUTH_BASE_URL,
    'http://127.0.0.1:4010/neondb/auth',
    'http://localhost:4010/neondb/auth',
    'http://[::1]:4010/neondb/auth',
  ])('[E2.2] accepts NEON_AUTH_BASE_URL=%s', (url) => {
    expect(loadConfig({ ...urls, NEON_AUTH_BASE_URL: url })).toMatchObject({ ok: true, config: { NEON_AUTH_BASE_URL: url } })
  })

  it.each([
    'http://ep-example.neonauth.eu-central-1.aws.neon.tech/neondb/auth',
    'ftp://auth.example.ch/neondb/auth',
    'neondb/auth',
  ])('[E2.2] refuses NEON_AUTH_BASE_URL=%s without printing it, because the signing keys come from there', (url) => {
    const message = failure({ ...urls, NEON_AUTH_BASE_URL: url })

    expect(message).toContain('  NEON_AUTH_BASE_URL: Expected an https:// URL, or http:// on this machine')
    expect(message).not.toContain(url)
  })
})
