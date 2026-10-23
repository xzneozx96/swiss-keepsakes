import type { Store } from '@sk/domain/identity'
import type { Tx } from '../../../platform/db/client.ts'
import type { StoreRepository } from '../ports.ts'
import { and, desc, eq, lt } from 'drizzle-orm'
import { stores } from './schema.ts'

const columns = {
  id: stores.id,
  slug: stores.slug,
  name: stores.name,
  status: stores.status,
  defaultLanguage: stores.defaultLanguage,
  createdAt: stores.createdAt,
}

export function createStoreRepository(): StoreRepository<Tx> {
  return {
    async insert(tx, store) {
      const [row] = await tx.insert(stores).values(store).onConflictDoNothing({ target: stores.slug }).returning(columns)
      return row
    },

    async find(tx, storeId) {
      const [row] = await tx.select(columns).from(stores).where(eq(stores.id, storeId))
      return row
    },

    async findForUpdate(tx, storeId) {
      const [row] = await tx.select(columns).from(stores).where(eq(stores.id, storeId)).for('update')
      return row
    },

    async list(tx, { limit, after }): Promise<Store[]> {
      return tx.select(columns).from(stores).where(after ? lt(stores.id, after) : undefined).orderBy(desc(stores.id)).limit(limit)
    },

    async updateInformation(tx, storeId, changes, at) {
      const [row] = await tx.update(stores).set({ ...changes, updatedAt: at }).where(eq(stores.id, storeId)).returning(columns)
      return row
    },

    async moveStatus(tx, storeId, from, to, at) {
      const moved = await tx.update(stores).set({ status: to, updatedAt: at }).where(and(eq(stores.id, storeId), eq(stores.status, from))).returning({ id: stores.id })
      return moved.length > 0
    },
  }
}
