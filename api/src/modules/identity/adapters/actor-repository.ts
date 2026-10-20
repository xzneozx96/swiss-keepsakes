import type { Actor } from '@sk/domain/identity'
import type { Database } from '../../../platform/db/client.ts'
import { actorFor } from '@sk/domain/identity'
import { eq } from 'drizzle-orm'
import { platformAdmins, storeMemberships } from './schema.ts'

// The HTTP layer calls this once per request that carries a valid token (architecture section 3).
// It reads one user's rows across stores, so it takes no StoreScope: it is what the store check reads.
export function createActorLoader(db: Database): (userId: string) => Promise<Actor> {
  return async (userId) => {
    const [admins, memberships] = await Promise.all([
      db.select({ userId: platformAdmins.userId }).from(platformAdmins).where(eq(platformAdmins.userId, userId)),
      db.select({ storeId: storeMemberships.storeId, role: storeMemberships.role }).from(storeMemberships).where(eq(storeMemberships.userId, userId)),
    ])
    return actorFor(userId, admins.length > 0, memberships)
  }
}
