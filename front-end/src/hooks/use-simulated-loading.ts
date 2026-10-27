import { useEffect, useState, useSyncExternalStore } from 'react'

const subscribeNever = () => () => {}

/**
 * Mock data loads instantly. A short delay on first render lets reviewers see the
 * skeleton state that spec §5.5 requires (never a full-page spinner).
 * Not while the browser hydrates server HTML: the server's page text is the first render and must stay
 * (React reads the server snapshot only then; a client-side render reads the client one).
 */
export function useSimulatedLoading(ms = 350): boolean {
  const hydrating = useSyncExternalStore(subscribeNever, () => false, () => true)
  const [loading, setLoading] = useState(!hydrating)

  useEffect(() => {
    const timer = window.setTimeout(setLoading, ms, false)

    return () => window.clearTimeout(timer)
  }, [ms])

  return loading
}
