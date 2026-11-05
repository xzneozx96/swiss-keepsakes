import { useSyncExternalStore } from 'react'

const query = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const list = window.matchMedia(query)

  list.addEventListener('change', onChange)

  return () => list.removeEventListener('change', onChange)
}

/** True when the guest asks for reduced motion. The server and the hydrating render read false, so `window` is never touched during render. */
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
