import { useEffect, useState } from 'react'

/** How long the URL waits after the last key before the list reads again. */
export const SEARCH_DELAY_MS = 250

/**
 * The text of a search box, which follows the typing at once while `commit` (the URL, or a query) follows it a moment after the
 * last key, so each letter does not read the list. `committed` is what the list was last asked for.
 */
export function useSearchBox(committed: string, commit: (text: string) => void, delayMs = SEARCH_DELAY_MS) {
  const [text, setText] = useState(committed)

  useEffect(() => {
    if (text === committed)
      return
    const timer = setTimeout(commit, delayMs, text)

    return () => clearTimeout(timer)
  }, [text, committed, commit, delayMs])

  return [text, setText] as const
}
