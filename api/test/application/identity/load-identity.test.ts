import type { AccessRepository, GuestProfileRepository, UnitOfWork } from '../../../src/modules/identity/ports.ts'
import { describe, expect, it } from 'vitest'
import { makeLoadIdentity } from '../../../src/modules/identity/application/load-identity.ts'

interface FakeTx { open: boolean }

const lucerne = '0190f0c2-0000-7000-8000-00000000000a'

function setup(options: { raceWinner?: boolean } = {}) {
  const profiles = new Map<string, string>()
  const inserts: string[] = []
  const uow: UnitOfWork<FakeTx> = {
    async run(work) {
      const tx = { open: true }
      try {
        return await work(tx)
      }
      finally {
        tx.open = false
      }
    },
  }
  const repository: GuestProfileRepository<FakeTx> = {
    async find(tx, authUserId) {
      if (!tx.open)
        throw new Error('used outside its transaction')
      return profiles.get(authUserId)
    },
    async insertIfAbsent(_tx, authUserId) {
      inserts.push(authUserId)
      // The other transaction commits first: the unique key makes this insert do nothing.
      if (options.raceWinner) {
        profiles.set(authUserId, 'winner-profile')
        return undefined
      }
      profiles.set(authUserId, `profile-${profiles.size + 1}`)
      return profiles.get(authUserId)
    },
  }
  const reads: boolean[] = []
  const access: AccessRepository<FakeTx> = {
    async find(tx, authUserId) {
      reads.push(tx.open)
      return authUserId === 'staff' ? { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'owner' }] } : { platformAdmin: authUserId === 'admin', memberships: [] }
    },
  }
  const load = makeLoadIdentity({ uow, profiles: repository, access })
  return { ensure: async (authUserId: string) => (await load(authUserId)).guestId, load, inserts, reads }
}

describe('[E2.2] the guest profile is created on the first authenticated call', () => {
  it('[E2.2] creates the profile on the first call and returns the same id on the next, without inserting again', async () => {
    const { ensure, inserts } = setup()

    const first = await ensure('user-1')
    const second = await ensure('user-1')

    expect(second).toBe(first)
    expect(inserts).toEqual(['user-1'])
  })

  it('[E2.2] when another transaction inserted the profile first, it returns that profile', async () => {
    const { ensure } = setup({ raceWinner: true })

    expect(await ensure('user-1')).toBe('winner-profile')
  })

  it('[E2.2] a different user gets a different profile', async () => {
    const { ensure } = setup()

    expect(await ensure('user-1')).not.toBe(await ensure('user-2'))
  })
})

describe('[E2.10] the roles are loaded with the profile, in the same transaction', () => {
  it('[E2.10] returns the profile id and the repository\'s roles for the user', async () => {
    const { load } = setup()

    expect(await load('staff')).toMatchObject({ access: { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'owner' }] } })
    expect(await load('admin')).toMatchObject({ access: { platformAdmin: true, memberships: [] } })
    expect(await load('nobody')).toMatchObject({ access: { platformAdmin: false, memberships: [] } })
  })

  it('[E2.10] reads the roles inside the transaction that made the profile, so a request opens one', async () => {
    const { load, reads } = setup()

    await load('staff')

    expect(reads).toEqual([true])
  })
})
