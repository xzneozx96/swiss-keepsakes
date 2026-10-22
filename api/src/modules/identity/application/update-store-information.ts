import type { Actor, Store, StoreLanguage } from '@sk/domain/identity'
import type { AuditLog, Clock, StoreRepository, UnitOfWork } from '../ports.ts'
import { can } from '@sk/domain/identity'

export interface UpdateStoreInformationDeps<T> {
  uow: UnitOfWork<T>
  stores: StoreRepository<T>
  audit: AuditLog<T>
  clock: Clock
}

export type UpdateStoreInformationResult = { ok: true, store: Store } | { ok: false, reason: 'forbidden' | 'store-not-found' }

// The Owner edits the store's name and default language (A02, section 5). Only an Owner may. The slug is the
// public address and stays as it is.
export function makeUpdateStoreInformation<T>({ uow, stores, audit, clock }: UpdateStoreInformationDeps<T>) {
  return async (actor: Actor, storeId: string, changes: { name?: string, defaultLanguage?: StoreLanguage }, requestId: string | null): Promise<UpdateStoreInformationResult> => {
    if (actor.kind !== 'staff' || !can(actor, 'edit-store-information', { storeId }))
      return { ok: false, reason: 'forbidden' }
    return uow.run(async (tx) => {
      const before = await stores.findForUpdate(tx, storeId)
      if (!before)
        return { ok: false, reason: 'store-not-found' }
      const store = await stores.updateInformation(tx, storeId, changes, clock.now())
      if (!store)
        return { ok: false, reason: 'store-not-found' }
      await audit.record(tx, {
        storeId,
        actor: `staff:${actor.userId}`,
        entity: 'store',
        entityId: storeId,
        action: 'information-updated',
        before: { name: before.name, defaultLanguage: before.defaultLanguage },
        after: { name: store.name, defaultLanguage: store.defaultLanguage },
        requestId,
      })
      return { ok: true, store }
    })
  }
}
