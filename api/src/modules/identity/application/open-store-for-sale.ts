import type { Actor, Store } from '@sk/domain/identity'
import type { AuditLog, Clock, ConditionSource, StoreRepository, UnitOfWork } from '../ports.ts'
import { can, mayOpenForSale } from '@sk/domain/identity'
import { onboardingConditions } from './get-onboarding.ts'

export interface OpenStoreForSaleDeps<T> {
  uow: UnitOfWork<T>
  stores: StoreRepository<T>
  conditions: ConditionSource<T>
  audit: AuditLog<T>
  clock: Clock
}

export type OpenStoreForSaleResult
  = | { ok: true, store: Store }
    | { ok: false, reason: 'forbidden' | 'store-not-found' | 'store-not-onboarding' | 'onboarding-incomplete' }

// The Owner opens the store for sale (A02, UX AC03). The store row is locked while the four conditions are read,
// so a store that is not `onboarding`, or has any condition unmet or pending, stays as it is. Only a live store sells.
export function makeOpenStoreForSale<T>({ uow, stores, conditions, audit, clock }: OpenStoreForSaleDeps<T>) {
  return async (actor: Actor, storeId: string, requestId: string | null): Promise<OpenStoreForSaleResult> => {
    if (actor.kind !== 'staff' || !can(actor, 'open-store-for-sale', { storeId }))
      return { ok: false, reason: 'forbidden' }
    return uow.run(async (tx): Promise<OpenStoreForSaleResult> => {
      const store = await stores.findForUpdate(tx, storeId)
      if (!store)
        return { ok: false, reason: 'store-not-found' }
      if (store.status !== 'onboarding')
        return { ok: false, reason: 'store-not-onboarding' }
      if (!mayOpenForSale(await onboardingConditions(conditions, tx, store)))
        return { ok: false, reason: 'onboarding-incomplete' }
      const at = clock.now()
      if (!await stores.moveStatus(tx, storeId, 'onboarding', 'live', at))
        return { ok: false, reason: 'store-not-onboarding' }
      await audit.record(tx, { storeId, actor: `staff:${actor.userId}`, entity: 'store', entityId: storeId, action: 'status-changed', before: { status: 'onboarding' }, after: { status: 'live' }, requestId })
      return { ok: true, store: { ...store, status: 'live' } }
    })
  }
}
