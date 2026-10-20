import type { GuestProfileRepository, UnitOfWork } from '../ports.ts'

export interface EnsureGuestProfileDeps<T> {
  uow: UnitOfWork<T>
  profiles: GuestProfileRepository<T>
}

// The first authenticated call creates the guest profile (architecture section 9). The unique key on the
// Better Auth user id lets two parallel first calls insert one row: the loser's insert waits for the winner's
// commit, does nothing, and reads the winner's row.
export function makeEnsureGuestProfile<T>({ uow, profiles }: EnsureGuestProfileDeps<T>) {
  return async (authUserId: string): Promise<string> => uow.run(async (tx) => {
    const guestId = await profiles.find(tx, authUserId)
      ?? await profiles.insertIfAbsent(tx, authUserId)
      ?? await profiles.find(tx, authUserId)
    if (!guestId)
      throw new Error('The guest profile was neither found nor created')
    return guestId
  })
}
