import { useCanGoBack, useRouter } from '@tanstack/react-router'

/**
 * Back for a screen's ← button: steps back through history when the guest came from
 * inside the app, else runs `fallback` (navigate to the parent with `replace: true`).
 * Never push the parent as a new entry: the parent's own Back would then return here
 * and the two screens bounce forever.
 */
export function useBack(fallback: () => void) {
  const router = useRouter()
  const canGoBack = useCanGoBack()

  return () => (canGoBack ? router.history.back() : fallback())
}
