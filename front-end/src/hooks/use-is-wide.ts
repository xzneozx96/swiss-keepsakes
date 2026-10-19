import { useSyncExternalStore } from 'react'

const query = '(min-width: 1024px)'

function subscribe(onChange: () => void) {
  const list = window.matchMedia(query)

  list.addEventListener('change', onChange)

  return () => list.removeEventListener('change', onChange)
}

/**
 * True from 1024px (Tailwind `lg`): M04 shows its sections in two columns there and as
 * tabs below it. One tree at a time, so ids and focus targets are never rendered twice.
 */
export function useIsWide() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
