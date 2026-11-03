import { useEffect, useState } from 'react'

/** A list that keeps the last result while a new filter loads shows the old rows for this long before its skeleton. */
export const LOADING_DELAY_MS = 180

/**
 * Whether a list should draw its loading skeleton: always while there is no data yet, and, when a changed filter,
 * search, tab or page keeps the previous rows as placeholder data (`isPlaceholderData`), once the answer has taken
 * longer than `LOADING_DELAY_MS`, so a fast answer swaps rows without a flash.
 */
export function useListLoading(query: { isPending: boolean, isPlaceholderData: boolean }, delayMs = LOADING_DELAY_MS): boolean {
  const { isPending, isPlaceholderData } = query
  const [late, setLate] = useState(false)

  useEffect(() => {
    if (!isPlaceholderData)
      return
    const timer = setTimeout(setLate, delayMs, true)

    // Leaving the wait (answer arrived, or a newer filter) starts the next wait from zero.
    return () => {
      clearTimeout(timer)
      setLate(false)
    }
  }, [isPlaceholderData, delayMs])

  return isPending || (isPlaceholderData && late)
}
