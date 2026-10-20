import type { DemoData, DemoState, Role } from './types'

import { StorageFullError } from '@/features/data-client/errors'
import { apiEnabled } from '@/lib/api-mode'
import { readStored, writeStored } from '@/lib/storage'

import { createSeedState, DEMO_VERSION } from './seed'
import { upgradeDemoData } from './upgrade'

const STORAGE_KEY = 'sk.demo'

/**
 * With the API, the session cookie decides who is signed in, so the browser neither keeps nor trusts a
 * saved copy of it.
 */
function withoutSession(state: DemoState): DemoState {
  return apiEnabled
    ? { ...state, data: { ...state.data, signedInGuestId: null } }
    : state
}

/** The saved demo data, or the seed when there is none or it was saved by another version. */
export function loadDemoState(): DemoState {
  const stored = readStored<DemoState | null>(STORAGE_KEY, null)

  if (stored?.version !== DEMO_VERSION)
    return createSeedState()

  return withoutSession({ ...stored, data: upgradeDemoData(stored.data) })
}

/** Replace the data with an updated copy; later steps add their actions on top of this. */
type Update = (recipe: (state: DemoState) => DemoState) => void

export interface DemoActions {
  update: Update
  setRole: (role: Role) => void
  reset: () => void
}

export interface DemoStore extends DemoActions {
  getState: () => DemoState
  getStorageFull: () => boolean
  subscribe: (listener: () => void) => () => void
  save: () => void
}

export function createDemoStore(initial: DemoState): DemoStore {
  const listeners = new Set<() => void>()
  let state = initial
  let storageFull = false

  const save = () => {
    const full = writeStored(STORAGE_KEY, withoutSession(state)) === 'full'

    if (full === storageFull)
      return
    storageFull = full
    listeners.forEach(notify => notify())
  }
  // Several updates in one event are saved once, after the last of them.
  let saveQueued = false
  const update: Update = (recipe) => {
    state = recipe(state)
    if (!saveQueued) {
      saveQueued = true
      queueMicrotask(() => {
        saveQueued = false
        save()
      })
    }
    listeners.forEach(notify => notify())
  }

  return {
    getState: () => state,
    getStorageFull: () => storageFull,
    subscribe(listener) {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
    save,
    update,
    setRole: role => update(s => ({ ...s, role })),
    // Keeps the current role so the presenter stays where they are.
    reset: () => update(s => ({ ...createSeedState(), role: s.role })),
  }
}

/** Replaces one collection of the demo data; the recipe also sees the whole state, for the clock and role. */
export function updateCollection<K extends keyof DemoData>(
  store: DemoStore,
  key: K,
  recipe: (value: DemoData[K], state: DemoState) => DemoData[K],
): void {
  store.update(s => ({
    ...s,
    data: { ...s.data, [key]: recipe(s.data[key], s) },
  }))
}

/** The demo state this app may keep in localStorage before a save is refused. */
const STORAGE_BUDGET = 4_500_000

/**
 * A write that can add large photos. It is refused, and nothing changes, when the saved data
 * would not fit, rather than living only until the next reload.
 */
export function updateWithinBudget(
  store: DemoStore,
  recipe: (state: DemoState) => DemoState,
): void {
  const next = recipe(store.getState())

  if (JSON.stringify(next).length > STORAGE_BUDGET)
    throw new StorageFullError()
  store.update(() => next)
}
