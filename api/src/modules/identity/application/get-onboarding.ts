import type { OnboardingConditions, Store } from '@sk/domain/identity'
import type { ConditionSource, StoreRepository, UnitOfWork } from '../ports.ts'
import { mayOpenForSale, onboardingConditionKeys, storeInformationState } from '@sk/domain/identity'

export interface OnboardingView {
  store: Store
  conditions: { key: keyof OnboardingConditions, state: OnboardingConditions[keyof OnboardingConditions] }[]
  mayOpenForSale: boolean
}

export async function onboardingConditions<T>(conditions: ConditionSource<T>, tx: T, store: Store): Promise<OnboardingConditions> {
  return { ...await conditions.laterConditions(tx, store.id), 'store-information': storeInformationState(store) }
}

export function onboardingView(store: Store, conditions: OnboardingConditions): OnboardingView {
  return {
    store,
    conditions: onboardingConditionKeys.map(key => ({ key, state: conditions[key] })),
    mayOpenForSale: mayOpenForSale(conditions),
  }
}

export interface GetOnboardingDeps<T> {
  uow: UnitOfWork<T>
  stores: StoreRepository<T>
  conditions: ConditionSource<T>
}

// A02's checklist for the store the guard verified. Any member of the store may read it.
export function makeGetOnboarding<T>({ uow, stores, conditions }: GetOnboardingDeps<T>) {
  return async (storeId: string): Promise<OnboardingView | undefined> => uow.run(async (tx) => {
    const store = await stores.find(tx, storeId)
    return store ? onboardingView(store, await onboardingConditions(conditions, tx, store)) : undefined
  })
}
