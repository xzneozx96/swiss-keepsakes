import { describe, expect, it } from 'vitest'
import { startMain } from './support/process.ts'

// The process tests that need Postgres are in integration/main.test.ts. These stop before any connection
// succeeds, so `pnpm test` runs them without a database.
const DATABASE_URL = 'postgres://postgres@127.0.0.1:5433/swiss_keepsakes'

describe('[E1.8] main: startup failures', () => {
  it('[E1.8] a bad env value stops startup with exit code 1 and a message that names the variable but not the value', async () => {
    const run = startMain({ ROLE: 'api', DATABASE_URL: 'mysql://admin:s3cret-pw@db.example/sk', DATABASE_URL_UNPOOLED: DATABASE_URL })

    expect(await run.exited).toBe(1)
    expect(run.output()).toContain('DATABASE_URL: Expected a postgres:// or postgresql:// URL')
    expect(run.output()).not.toContain('s3cret-pw')
    expect(run.messages()).toEqual([])
  })

  it('[E1.8] a missing DATABASE_URL stops startup with exit code 1', async () => {
    const run = startMain({ ROLE: 'all' })

    expect(await run.exited).toBe(1)
    expect(run.output()).toContain('DATABASE_URL: Required')
  })

  it('[E2.2] a missing BETTER_AUTH_SECRET stops startup with exit code 1, naming the variable', async () => {
    const run = startMain({ ROLE: 'all', DATABASE_URL, DATABASE_URL_UNPOOLED: DATABASE_URL, BETTER_AUTH_SECRET: '' })

    expect(await run.exited).toBe(1)
    expect(run.output()).toContain('BETTER_AUTH_SECRET: Required')
    expect(run.messages()).toEqual([])
  })

  it('[E1.9] a database that refuses connections stops startup with exit code 1, logged through pino without the URL', async () => {
    // Port 1 on this machine: nothing listens there.
    const unreachable = 'postgres://postgres:s3cret-pw@127.0.0.1:1/swiss_keepsakes'
    const run = startMain({ ROLE: 'all', PORT: '0', DATABASE_URL: unreachable, DATABASE_URL_UNPOOLED: unreachable })

    expect(await run.exited).toBe(1)
    expect(run.find('startup failed')).toMatchObject({ level: 60, err: { code: 'ECONNREFUSED' } })
    expect(run.messages()).not.toContain('api listening')
    expect(run.output()).not.toContain('s3cret-pw')
  })
})
