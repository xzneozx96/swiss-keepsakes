import type { Access } from '@sk/domain/identity'
import type { AccessRepository, GuestProfileRepository, UnitOfWork } from '../ports.ts'

export interface LoadIdentityDeps<T> {
  uow: UnitOfWork<T>
  profiles: GuestProfileRepository<T>
  access: AccessRepository<T>
}

// Everything the HTTP layer needs to build the actor of a signed-in request, in one transaction: the guest
// profile, created on the first authenticated call (architecture section 9), and the user's roles across
// stores. The unique key on the Better Auth user id lets two parallel first calls insert one row: the loser's
// insert waits for the winner's commit, does nothing, and reads the winner's row.
export function makeLoadIdentity<T>({ uow, profiles, access }: LoadIdentityDeps<T>) {
  return async (authUserId: string): Promise<{ guestId: string, access: Access }> => uow.run(async (tx) => {
    const guestId = await profiles.find(tx, authUserId)
      ?? await profiles.insertIfAbsent(tx, authUserId)
      ?? await profiles.find(tx, authUserId)
    if (!guestId)
      throw new Error('The guest profile was neither found nor created')
    return { guestId, access: await access.find(tx, authUserId) }
  })
}
