import type { AdminStore } from '@sk/api-contract'

export interface StoreCounts {
  total: number
  waiting: number
  onboarding: number
  live: number
}

/** The figures of A01's tiles, counted from the stores already loaded. A store waits for its Owner until the invitation is accepted. */
export function countStores(stores: readonly AdminStore[]): StoreCounts {
  return {
    total: stores.length,
    waiting: stores.filter(store => store.invitation?.state === 'open' || store.invitation?.state === 'expired').length,
    onboarding: stores.filter(store => store.status === 'onboarding').length,
    live: stores.filter(store => store.status === 'live').length,
  }
}
