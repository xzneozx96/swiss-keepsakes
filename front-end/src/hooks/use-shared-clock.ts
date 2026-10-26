import { useSyncExternalStore } from 'react'

interface Clock {
  subscribe: (listener: () => void) => () => void
  read: () => number
}

const clocks = new Map<number, Clock>()

function createClock(period: number): Clock {
  const listeners = new Set<() => void>()
  let now = Date.now()
  let timer: number | undefined

  // Read during render too, so an idle clock never shows a time older than one period.
  const refresh = () => {
    if (Date.now() - now >= period)
      now = Date.now()
  }

  return {
    subscribe(listener) {
      refresh()
      listeners.add(listener)
      if (listeners.size === 1) {
        timer = window.setInterval(() => {
          now = Date.now()
          listeners.forEach(notify => notify())
        }, period)
      }

      return () => {
        listeners.delete(listener)
        if (listeners.size === 0)
          window.clearInterval(timer)
      }
    },
    read() {
      if (listeners.size === 0)
        refresh()

      return now
    },
  }
}

/**
 * Real time in ms, refreshed every `period` ms. All components asking for one period share one timer.
 * The server and the first client render, which hydrates the server HTML, read `initial`, so the text matches.
 */
export function useSharedClock(period: number, initial: number): number {
  let clock = clocks.get(period)

  if (!clock) {
    clock = createClock(period)
    clocks.set(period, clock)
  }

  return useSyncExternalStore(clock.subscribe, clock.read, () => initial)
}
