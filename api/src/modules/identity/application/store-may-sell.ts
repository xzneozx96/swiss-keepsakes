import type { StoreRepository } from '../ports.ts'
import { storeMaySell } from '@sk/domain/identity'

// For the stories that sell: checkout, holds and payments ask this inside their own transaction, through
// the module's index. A store that does not exist may not sell.
export function makeStoreMaySell<T>({ stores }: { stores: StoreRepository<T> }) {
  return async (tx: T, storeId: string): Promise<boolean> => {
    const store = await stores.find(tx, storeId)
    return store !== undefined && storeMaySell(store.status)
  }
}
