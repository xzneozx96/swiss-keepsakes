import { describe, expect, it } from 'vitest'
import { loadConfig } from '../../src/platform/config.ts'

const DATABASE_URL = 'postgres://postgres@127.0.0.1:5433/swiss_keepsakes'
const DATABASE_URL_UNPOOLED = 'postgres://postgres@127.0.0.1:5433/swiss_keepsakes?direct'
// A placeholder of the right length, not a secret.
const BETTER_AUTH_SECRET = 'test-only-secret-0123456789-abcdefghij'
const urls = { DATABASE_URL, DATABASE_URL_UNPOOLED, BETTER_AUTH_URL: 'http://localhost:5173', BETTER_AUTH_SECRET }

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
    expect(failure({ ROLE: 'api' })).toBe([
      'Invalid environment, the service did not start:',
      '  DATABASE_URL: Required',
      '  DATABASE_URL_UNPOOLED: Required',
      '  BETTER_AUTH_URL: Required',
      '  BETTER_AUTH_SECRET: Required',
      'Values are never printed.',
    ].join('\n'))
  })

  it('[E1.9] requires DATABASE_URL_UNPOOLED in every role, because every role starts pg-boss', () => {
    for (const ROLE of ['api', 'worker', 'all'])
      expect(failure({ ROLE, DATABASE_URL })).toContain('  DATABASE_URL_UNPOOLED: Required')
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
    const message = failure({ DATABASE_URL: 'mysql://admin:s3cret-pw@db.example/sk', DATABASE_URL_UNPOOLED, ROLE: 'hunter2' })

    expect(message).toContain('  DATABASE_URL: Expected a postgres:// or postgresql:// URL with a host')
    expect(message).toMatch(/^ {2}ROLE: /m)
    expect(message).not.toContain('s3cret-pw')
    expect(message).not.toContain('mysql://')
    expect(message).not.toContain('hunter2')
  })

  it('[E1.8] rejects a DATABASE_URL with no host', () => {
    expect(failure({ DATABASE_URL: 'postgres:///swiss_keepsakes', DATABASE_URL_UNPOOLED })).toContain('  DATABASE_URL: Expected a postgres:// or postgresql:// URL with a host')
  })

  it('[E1.9] checks DATABASE_URL_UNPOOLED like DATABASE_URL, without printing the value', () => {
    const message = failure({ DATABASE_URL, DATABASE_URL_UNPOOLED: 'mysql://admin:s3cret-pw@db.example/sk' })

    expect(message).toContain('  DATABASE_URL_UNPOOLED: Expected a postgres:// or postgresql:// URL with a host')
    expect(message).not.toContain('s3cret-pw')
  })
})

describe('[E2.8] config: SMTP_* is all six variables or none', () => {
  const smtp = {
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: '465',
    SMTP_SECURE: 'true',
    SMTP_USER: 'keepsakes.test@gmail.com',
    SMTP_PASSWORD: 'abcd efgh ijkl mnop',
    SMTP_FROM: 'keepsakes.test@gmail.com',
  }

  it('[E2.8] turns all six into one smtp setting, with the port a number and SMTP_SECURE a boolean', () => {
    expect(loadConfig({ ...urls, ...smtp })).toEqual({
      ok: true,
      config: {
        ROLE: 'all',
        HOST: '0.0.0.0',
        PORT: 3000,
        LOG_LEVEL: 'info',
        ...urls,
        smtp: { host: 'smtp.gmail.com', port: 465, secure: true, user: 'keepsakes.test@gmail.com', password: 'abcd efgh ijkl mnop', from: 'keepsakes.test@gmail.com' },
      },
    })
  })

  it('[E2.8] starts without SMTP when none of the six is set, blank values included', () => {
    const result = loadConfig({ ...urls, SMTP_HOST: '', SMTP_PASSWORD: ' ' })

    expect(result).toMatchObject({ ok: true })
    expect(result.ok && result.config.smtp).toBeUndefined()
  })

  it('[E2.8] refuses a partial setting and names each missing variable, without printing the ones that are set', () => {
    const message = failure({ ...urls, SMTP_HOST: 'smtp.gmail.com', SMTP_USER: 'keepsakes.test@gmail.com', SMTP_PASSWORD: 'abcd efgh ijkl mnop' })

    expect(message).toBe([
      'Invalid environment, the service did not start:',
      '  SMTP_PORT: Required when any SMTP_* variable is set',
      '  SMTP_SECURE: Required when any SMTP_* variable is set',
      '  SMTP_FROM: Required when any SMTP_* variable is set',
      'Values are never printed.',
    ].join('\n'))
  })

  it('[E2.8] rejects a bad port, a SMTP_SECURE other than true or false, and a sender that is not an address', () => {
    const message = failure({ ...urls, ...smtp, SMTP_PORT: '465x', SMTP_SECURE: 'True', SMTP_FROM: 'Keepsakes <keepsakes.test@gmail.com>' })

    expect(message).toContain('  SMTP_PORT: Expected a whole number from 0 to 65535')
    expect(message).toMatch(/^ {2}SMTP_SECURE: .*"true"\|"false"/m)
    expect(message).toContain('  SMTP_FROM: Expected an email address')
    expect(message).not.toContain('keepsakes.test')
    expect(message).not.toContain('abcd efgh')
  })

  it.each([
    ['465', 'false', '  SMTP_SECURE: Port 465 starts with TLS. Expected true'],
    ['587', 'true', '  SMTP_SECURE: Port 587 upgrades with STARTTLS. Expected false'],
  ])('[E2.8] rejects SMTP_PORT=%s with SMTP_SECURE=%s', (port, secure, line) => {
    expect(failure({ ...urls, ...smtp, SMTP_PORT: port, SMTP_SECURE: secure })).toContain(line)
  })

  it('[E2.8] accepts STARTTLS on 587 and another port with either setting', () => {
    expect(loadConfig({ ...urls, ...smtp, SMTP_PORT: '587', SMTP_SECURE: 'false' })).toMatchObject({ ok: true, config: { smtp: { port: 587, secure: false } } })
    expect(loadConfig({ ...urls, ...smtp, SMTP_PORT: '2465', SMTP_SECURE: 'true' })).toMatchObject({ ok: true, config: { smtp: { port: 2465, secure: true } } })
  })
})

describe('[E2.2] config: Better Auth variables', () => {
  it('[E2.2] requires BETTER_AUTH_URL and BETTER_AUTH_SECRET in every environment, so a missing secret never falls back to a default', () => {
    expect(failure({ DATABASE_URL, DATABASE_URL_UNPOOLED })).toBe([
      'Invalid environment, the service did not start:',
      '  BETTER_AUTH_URL: Required',
      '  BETTER_AUTH_SECRET: Required',
      'Values are never printed.',
    ].join('\n'))
  })

  it('[E2.2] rejects a short secret and a URL that is not http or https, without printing either', () => {
    const message = failure({ ...urls, BETTER_AUTH_SECRET: 'short-secret', BETTER_AUTH_URL: 'ftp://app.example' })

    expect(message).toContain('  BETTER_AUTH_URL: Expected an http:// or https:// URL')
    expect(message).toContain('  BETTER_AUTH_SECRET: Expected at least 32 characters')
    expect(message).not.toContain('short-secret')
    expect(message).not.toContain('ftp://')
  })

  it('[E2.2] starts without Google credentials, and leaves google unset', () => {
    const result = loadConfig(urls)

    expect(result).toMatchObject({ ok: true })
    expect(result.ok && result.config.google).toBeUndefined()
  })

  it('[E2.2] turns both Google variables into one google setting', () => {
    expect(loadConfig({ ...urls, GOOGLE_CLIENT_ID: 'id.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'google-secret' })).toMatchObject({
      ok: true,
      config: { google: { clientId: 'id.apps.googleusercontent.com', clientSecret: 'google-secret' } },
    })
  })

  it('[E2.2] refuses one Google variable without the other, and blank counts as unset', () => {
    expect(failure({ ...urls, GOOGLE_CLIENT_ID: 'id.apps.googleusercontent.com' })).toContain('  GOOGLE_CLIENT_SECRET: Required when any GOOGLE_* variable is set')
    expect(loadConfig({ ...urls, GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: ' ' })).toMatchObject({ ok: true })
  })
})
