import { describe, expect, it } from 'vitest'
import { makeGrantSuperAdmin } from '../../../src/modules/identity/application/grant-super-admin.ts'
import { createFakeIdentity } from '../../support/fake-identity.ts'

function setup() {
  const fake = createFakeIdentity()
  fake.addUser('user-ngoc', 'ngoc.tran@example.ch')
  return { fake, grant: makeGrantSuperAdmin({ uow: fake.uow, users: fake.users, admins: fake.admins }) }
}

describe('[E2.3] admin:grant makes the first Super Admin', () => {
  it('[E2.3] adds the user\'s platform_admins row with no granting user, found by the address in any case', async () => {
    const { fake, grant } = setup()

    expect(await grant('  Ngoc.Tran@Example.CH ')).toEqual({ ok: true, userId: 'user-ngoc' })
    expect(fake.state.admins).toEqual([{ userId: 'user-ngoc', grantedBy: null }])
  })

  it('[E2.3] refuses an address with no user, and adds nothing', async () => {
    const { fake, grant } = setup()

    expect(await grant('nobody@example.ch')).toEqual({ ok: false, reason: 'user-not-found' })
    expect(fake.state.admins).toEqual([])
  })

  it('[E2.3] refuses a user who is already a Super Admin, and adds nothing', async () => {
    const { fake, grant } = setup()
    await grant('ngoc.tran@example.ch')

    expect(await grant('ngoc.tran@example.ch')).toEqual({ ok: false, reason: 'already-admin' })
    expect(fake.state.admins).toHaveLength(1)
  })
})
