import type { AdminStore } from '@sk/api-contract'

/**
 * How many of the four opening conditions a store has met, counted from `store.conditions`, which the server
 * computes by the same rule that decides open-for-sale. `pending` and `unmet` both count as not met.
 */
export function conditionsMet(store: AdminStore): 0 | 1 | 2 | 3 | 4 {
  return Object.values(store.conditions).filter(state => state === 'met').length as 0 | 1 | 2 | 3 | 4
}
