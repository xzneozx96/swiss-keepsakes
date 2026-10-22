import type { Tx } from '../../../platform/db/client.ts'
import type { PlatformAdminRepository } from '../ports.ts'
import { eq } from 'drizzle-orm'
import { platformAdmins } from './schema.ts'

export function createPlatformAdminRepository(): PlatformAdminRepository<Tx> {
  return {
    async has(tx, userId) {
      const rows = await tx.select({ userId: platformAdmins.userId }).from(platformAdmins).where(eq(platformAdmins.userId, userId))
      return rows.length > 0
    },

    async insertFirst(tx, userId) {
      await tx.insert(platformAdmins).values({ userId, grantedBy: null })
    },
  }
}
