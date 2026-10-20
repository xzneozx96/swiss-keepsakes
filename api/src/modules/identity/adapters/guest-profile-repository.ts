import type { Tx } from '../../../platform/db/client.ts'
import type { GuestProfileRepository } from '../ports.ts'
import { eq } from 'drizzle-orm'
import { guestProfiles } from './schema.ts'

export function createGuestProfileRepository(): GuestProfileRepository<Tx> {
  return {
    async find(tx, authUserId) {
      const [row] = await tx.select({ id: guestProfiles.id }).from(guestProfiles).where(eq(guestProfiles.authUserId, authUserId))
      return row?.id
    },

    async insertIfAbsent(tx, authUserId) {
      const [row] = await tx.insert(guestProfiles).values({ authUserId }).onConflictDoNothing({ target: guestProfiles.authUserId }).returning({ id: guestProfiles.id })
      return row?.id
    },
  }
}
