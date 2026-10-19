import { useEffect, useState } from 'react'

/**
 * Mock data loads instantly. A short delay on first render lets reviewers see the
 * skeleton state that spec §5.5 requires (never a full-page spinner).
 */
export function useSimulatedLoading(ms = 350): boolean {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(setLoading, ms, false)

    return () => window.clearTimeout(timer)
  }, [ms])

  return loading
}
