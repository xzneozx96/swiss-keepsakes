import { describe, expect, it } from 'vitest'
import { allowRemoteFlag, refusedDatabaseTarget } from './database-target.ts'

const local = 'postgres://postgres@127.0.0.1:5433/swiss_keepsakes'
const neon = 'postgresql://app:s3cret@ep-cool-name-123456-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require'

describe('[E1.9] the integration tests refuse a database that is not on this machine', () => {
  it.each([local, 'postgres://postgres@localhost/db', 'postgres://postgres@[::1]:5433/db'])('[E1.9] accepts %s', (url) => {
    expect(refusedDatabaseTarget({ DATABASE_URL: url, DATABASE_URL_UNPOOLED: url }, {})).toBeUndefined()
  })

  it('[E1.9] refuses a Neon URL in either variable unless the flag is set, without printing the URL', () => {
    const pooled = refusedDatabaseTarget({ DATABASE_URL: neon, DATABASE_URL_UNPOOLED: local }, {})
    const direct = refusedDatabaseTarget({ DATABASE_URL: local, DATABASE_URL_UNPOOLED: neon }, {})

    expect(pooled).toContain('DATABASE_URL does not point at this machine')
    expect(direct).toContain('DATABASE_URL_UNPOOLED does not point at this machine')
    expect(`${pooled}${direct}`).not.toContain('s3cret')
    expect(refusedDatabaseTarget({ DATABASE_URL: neon, DATABASE_URL_UNPOOLED: neon }, { [allowRemoteFlag]: 'yes' })).toBeDefined()
    expect(refusedDatabaseTarget({ DATABASE_URL: neon, DATABASE_URL_UNPOOLED: neon }, { [allowRemoteFlag]: '1' })).toBeUndefined()
  })

  it('[E1.9] names a missing variable', () => {
    expect(refusedDatabaseTarget({ DATABASE_URL: local, DATABASE_URL_UNPOOLED: undefined }, {})).toMatch(/^DATABASE_URL_UNPOOLED is not set/)
  })
})
