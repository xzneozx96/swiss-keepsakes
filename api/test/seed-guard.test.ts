import { describe, expect, it } from 'vitest'
import { isLocalDatabaseUrl } from '../scripts/seed-guard.ts'

describe('[E2.12] the db:seed host guard', () => {
  it('[E2.12] accepts loopback hosts', () => {
    expect(isLocalDatabaseUrl('postgres://u:p@localhost:5432/db')).toBe(true)
    expect(isLocalDatabaseUrl('postgres://u:p@127.0.0.1/db')).toBe(true)
    expect(isLocalDatabaseUrl('postgres://u:p@[::1]:5432/db')).toBe(true)
  })

  it('[E2.12] refuses a remote host and an unparsable URL', () => {
    expect(isLocalDatabaseUrl('postgres://u:p@ep-x.eu-central-1.aws.neon.tech/db')).toBe(false)
    expect(isLocalDatabaseUrl('not a url')).toBe(false)
  })

  it('[E2.12] refuses a local host that a host, hostaddr or service parameter overrides', () => {
    expect(isLocalDatabaseUrl('postgres://u:p@localhost/db?host=ep-x.neon.tech')).toBe(false)
    expect(isLocalDatabaseUrl('postgres://u:p@localhost/db?sslmode=require&hostaddr=203.0.113.5')).toBe(false)
    expect(isLocalDatabaseUrl('postgres://u:p@localhost/db?service=prod')).toBe(false)
  })
})
