import type { GuestProfileRepository, UnitOfWork } from '../../../src/modules/identity/ports.ts'
import { describe, expect, it } from 'vitest'
import { makeEnsureGuestProfile } from '../../../src/modules/identity/application/ensure-guest-profile.ts'

interface FakeTx { open: boolean }

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
  return { ensure: makeEnsureGuestProfile({ uow, profiles: repository }), inserts }
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
