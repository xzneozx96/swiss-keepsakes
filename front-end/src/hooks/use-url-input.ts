import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useState,
} from 'react'

/**
 * A text input that mirrors a URL search param. Typing stays instant on local state, the heavy
 * results read a deferred copy, and the URL follows after a short pause inside a transition, so
 * a keystroke never waits on the router. A change to the URL from outside (back button, a
 * link) replaces the text.
 */
export function useUrlInput(
  urlValue: string,
  commit: (value: string) => void,
  delay = 250,
) {
  const [value, setValue] = useState(urlValue)
  const deferred = useDeferredValue(value)
  // The last text this hook sent to the URL, so its own echo is not mistaken for a change from outside.
  const [sent, setSent] = useState(urlValue)
  const [seenUrl, setSeenUrl] = useState(urlValue)
  const send = useEffectEvent((next: string) => {
    setSent(next)
    startTransition(() => commit(next))
  })

  if (urlValue !== seenUrl) {
    setSeenUrl(urlValue)
    if (urlValue !== sent) {
      setSent(urlValue)
      setValue(urlValue)
    }
  }

  useEffect(() => {
    if (value === sent)
      return
    const timer = window.setTimeout(send, delay, value)

    return () => window.clearTimeout(timer)
  }, [value, sent, delay])

  return { value, setValue, deferred }
}
