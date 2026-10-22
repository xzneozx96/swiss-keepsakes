import type { Tx } from '../../../platform/db/client.ts'
import type { MembershipRepository } from '../ports.ts'
import { and, asc, eq } from 'drizzle-orm'
import { storeMemberships, user } from './schema.ts'

const memberColumns = {
  id: storeMemberships.id,
  userId: storeMemberships.userId,
  email: user.email,
  role: storeMemberships.role,
  acceptedAt: storeMemberships.acceptedAt,
}

export function createMembershipRepository(): MembershipRepository<Tx> {
  return {
    async insertIfAbsent(tx, membership) {
      const inserted = await tx.insert(storeMemberships).values(membership).onConflictDoNothing({ target: [storeMemberships.userId, storeMemberships.storeId] }).returning({ id: storeMemberships.id })
      return inserted.length > 0
    },

    async list(tx, storeId) {
      return tx.select(memberColumns).from(storeMemberships).innerJoin(user, eq(user.id, storeMemberships.userId)).where(eq(storeMemberships.storeId, storeId)).orderBy(asc(storeMemberships.id))
    },

    async has(tx, storeId, userId) {
      const rows = await tx.select({ id: storeMemberships.id }).from(storeMemberships).where(and(eq(storeMemberships.storeId, storeId), eq(storeMemberships.userId, userId)))
      return rows.length > 0
    },

    async findInStoreForUpdate(tx, storeId, memberId) {
      const [row] = await tx.select({ id: storeMemberships.id }).from(storeMemberships).where(and(eq(storeMemberships.id, memberId), eq(storeMemberships.storeId, storeId))).for('update')
      if (!row)
        return undefined
      const [member] = await tx.select(memberColumns).from(storeMemberships).innerJoin(user, eq(user.id, storeMemberships.userId)).where(eq(storeMemberships.id, memberId))
      return member
    },

    async remove(tx, storeId, memberId) {
      await tx.delete(storeMemberships).where(and(eq(storeMemberships.id, memberId), eq(storeMemberships.storeId, storeId)))
    },
  }
}
