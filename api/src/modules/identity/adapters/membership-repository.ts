import type { Tx } from '../../../platform/db/client.ts'
import type { MembershipRepository } from '../ports.ts'
import { storeMemberships } from './schema.ts'

export function createMembershipRepository(): MembershipRepository<Tx> {
  return {
    async insertIfAbsent(tx, membership) {
      const inserted = await tx.insert(storeMemberships).values(membership).onConflictDoNothing({ target: [storeMemberships.userId, storeMemberships.storeId] }).returning({ id: storeMemberships.id })
      return inserted.length > 0
    },
  }
}
