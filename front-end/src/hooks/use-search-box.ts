import { useEffect, useState } from 'react'

/** How long the URL waits after the last key before the list reads again. */
export const SEARCH_DELAY_MS = 250

/**
 * The text of a search box, which follows the typing at once while `commit` (the URL, or a query) follows it a moment after the
 * last key, so each letter does not read the list. `committed` is what the list was last asked for. When it changes from outside
 * (Back, a cleared filter) and the person has typed nothing that waits to be committed, the text follows it.
 */
export function useSearchBox(committed: string, commit: (text: string) => void, delayMs = SEARCH_DELAY_MS) {
  const [text, setText] = useState(committed)
  const [seen, setSeen] = useState(committed)

  // Adjusted while rendering, so the box never shows a stale search for a frame.
  if (committed !== seen) {
    setSeen(committed)
    if (text === seen)
      setText(committed)
  }

  useEffect(() => {
    if (text === committed)
      return
    const timer = setTimeout(commit, delayMs, text)

    return () => clearTimeout(timer)
  }, [text, committed, commit, delayMs])

  return [text, setText] as const
}
