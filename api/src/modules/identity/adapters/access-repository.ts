import type { Tx } from '../../../platform/db/client.ts'
import type { AccessRepository } from '../ports.ts'
import { eq } from 'drizzle-orm'
import { platformAdmins, storeMemberships } from './schema.ts'

export function createAccessRepository(): AccessRepository<Tx> {
  return {
    async find(tx, authUserId) {
      const admins = await tx.select({ userId: platformAdmins.userId }).from(platformAdmins).where(eq(platformAdmins.userId, authUserId))
      const memberships = await tx.select({ storeId: storeMemberships.storeId, role: storeMemberships.role }).from(storeMemberships).where(eq(storeMemberships.userId, authUserId))
      return { platformAdmin: admins.length > 0, memberships }
    },
  }
}
