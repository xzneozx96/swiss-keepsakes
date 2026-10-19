import type { DemoState, Role } from './types'

import {
  createContext,
  use,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'

import { useSharedClock } from '@/hooks/use-shared-clock'
import { readStored, writeStored } from '@/lib/storage'
import { demoNow } from './clock'

import { createSeedState, DEMO_VERSION } from './seed'
import { upgradeDemoData } from './upgrade'

const STORAGE_KEY = 'sk.demo'

function loadState(): DemoState {
  const stored = readStored<DemoState | null>(STORAGE_KEY, null)

  if (stored?.version !== DEMO_VERSION)
    return createSeedState()

  return { ...stored, data: upgradeDemoData(stored.data) }
}

/** Replace the data with an updated copy; later steps add their actions on top of this. */
type Update = (recipe: (state: DemoState) => DemoState) => void

interface DemoActions {
  update: Update
  setRole: (role: Role) => void
  reset: () => void
}

interface DemoStore extends DemoActions {
  getState: () => DemoState
  getStorageFull: () => boolean
  subscribe: (listener: () => void) => () => void
  save: () => void
}

function createDemoStore(initial: DemoState): DemoStore {
  const listeners = new Set<() => void>()
  let state = initial
  let storageFull = false

  const save = () => {
    const full = writeStored(STORAGE_KEY, state) === 'full'

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

const DemoContext = createContext<DemoStore | null>(null)

/** The store never changes, so the provider never re-renders what is under it. */
export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => createDemoStore(loadState()))

  useEffect(() => store.save(), [store])

  return <DemoContext value={store}>{children}</DemoContext>
}

function useStore(): DemoStore {
  const store = use(DemoContext)

  if (!store)
    throw new Error('useDemo must be used inside DemoProvider')

  return store
}

/**
 * One slice of the state. The component re-renders only when the slice changes, so select a
 * primitive or an existing part of the state (`(s) => s.data.orders`), never a new object.
 */
export function useDemoSelector<T>(select: (state: DemoState) => T): T {
  const store = useStore()

  return useSyncExternalStore(store.subscribe, () => select(store.getState()))
}

/** The writers, without subscribing to any state. */
export function useDemoActions(): DemoActions {
  const { update, setRole, reset } = useStore()

  return useMemo(() => ({ update, setRole, reset }), [update, setRole, reset])
}

/** The browser refused the last save because storage is full, so the latest changes live in this tab only. */
export function useStorageFull(): boolean {
  const store = useStore()

  return useSyncExternalStore(store.subscribe, store.getStorageFull)
}

/** The whole state: re-renders on every change. Prefer `useDemoSelector` for a part of it. */
export function useDemo(): DemoActions & { state: DemoState } {
  const state = useDemoSelector(s => s)
  const actions = useDemoActions()

  return useMemo(() => ({ state, ...actions }), [state, actions])
}

/** Current demo time, refreshed every 30 seconds for countdowns and "due in" labels. */
export function useDemoNow(): Date {
  const clockStartedAt = useDemoSelector(s => s.clockStartedAt)

  return demoNow(clockStartedAt, useSharedClock(30_000))
}
