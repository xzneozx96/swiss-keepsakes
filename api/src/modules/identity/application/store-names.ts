import type { StoreRepository } from '../ports.ts'

// For the public keepsake cards, which show the name of the store (ADR-013: the catalog holds only the store id). A page has one
// store or a few, so this reads each distinct id once, one after the other, because one transaction runs one query at a time.
// A store that does not exist has no entry in the map.
export function makeStoreNames<T>({ stores }: { stores: StoreRepository<T> }) {
  return async (tx: T, storeIds: string[]): Promise<Map<string, string>> => {
    const names = new Map<string, string>()
    for (const id of new Set(storeIds)) {
      const store = await stores.find(tx, id)
      if (store)
        names.set(id, store.name)
    }
    return names
  }
}
