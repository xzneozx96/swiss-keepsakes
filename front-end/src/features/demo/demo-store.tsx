import type { DemoActions, DemoStore } from './store'
import type { DemoState } from './types'

import {
  createContext,
  use,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react'

import { useSharedClock } from '@/hooks/use-shared-clock'
import { demoNow } from './clock'

const DemoContext = createContext<DemoStore | null>(null)

/** The store never changes, so the provider never re-renders what is under it. */
export function DemoProvider({
  store,
  children,
}: {
  store: DemoStore
  children: React.ReactNode
}) {
  useEffect(() => store.save(), [store])

  return <DemoContext value={store}>{children}</DemoContext>
}

function useStore(): DemoStore {
  const store = use(DemoContext)

  if (!store)
    throw new Error('Demo hooks must be used inside DemoProvider')

  return store
}

/**
 * One slice of the browser-only state: the role, the clock, sign-in, the cart, saved gifts and
 * drafts. Shop data comes from the feature query hooks. The component re-renders only when the
 * slice changes, so select a primitive or an existing part of the state, never a new object.
 */
export function useDemoSelector<T>(select: (state: DemoState) => T): T {
  const store = useStore()

  // While React hydrates server HTML it reads the state the server rendered, whatever the store holds by then.
  return useSyncExternalStore(
    store.subscribe,
    () => select(store.getState()),
    () => select(store.getInitialState()),
  )
}

/** The writers, without subscribing to any state. */
export function useDemoActions(): DemoActions {
  const { update, setRole, reset } = useStore()

  return useMemo(() => ({ update, setRole, reset }), [update, setRole, reset])
}

/** The browser refused the last save because storage is full, so the latest changes live in this tab only. */
export function useStorageFull(): boolean {
  const store = useStore()

  return useSyncExternalStore(store.subscribe, store.getStorageFull, () => false)
}

/** Current demo time, refreshed every 30 seconds for countdowns and "due in" labels. */
export function useDemoNow(): Date {
  const clockStartedAt = useDemoSelector(s => s.clockStartedAt)

  return demoNow(clockStartedAt, useSharedClock(30_000))
}
