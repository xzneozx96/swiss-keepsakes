import { useSyncExternalStore } from 'react'

import { readStored, writeStored } from '@/lib/storage'

/**
 * Presenter switch "Show proposals" (spec §7): when on, every element based on an
 * undecided UX proposal is outlined. Kept outside the demo data so Reset leaves it alone.
 */
const STORAGE_KEY = 'sk.showProposals'
const listeners = new Set<() => void>()
let showProposals = readStored<unknown>(STORAGE_KEY, false) === true

function subscribe(listener: () => void) {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

export function setShowProposals(next: boolean): void {
  showProposals = next
  writeStored(STORAGE_KEY, next)
  listeners.forEach(l => l())
}

export function useShowProposals(): boolean {
  return useSyncExternalStore(subscribe, () => showProposals)
}
