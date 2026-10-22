import { useRef } from 'react'

import { ApiProblem } from '@/features/data-client/errors'

/**
 * Whether the same request may be sent again with the same key. A lost connection, a timeout and a 5xx leave it
 * unknown whether the API did the work, and the key makes the retry safe. `idempotency-key-in-use` means the first
 * request is still running. Every other 4xx is the API's final answer, and it replays that answer for 24 hours to
 * the same key, so the next attempt needs a new one.
 */
export function keepsKey(error: Error): boolean {
  if (!(error instanceof ApiProblem))
    return true

  return error.status >= 500 || error.type === 'idempotency-key-in-use'
}

/**
 * One `Idempotency-Key` for one intent of the user, not one per request: `next()` returns the same key for the
 * same `input` until `settled` sees a success or a final answer, so a retry after a timeout cannot do the work
 * twice. A changed input is another intent and gets a new key. Call `next()` and `settled()` from event
 * handlers and mutation callbacks, never during render.
 */
export function useIdempotencyKey(input: unknown) {
  const heldRef = useRef<{ fingerprint: string, key: string } | undefined>(undefined)

  return {
    next: (): string => {
      const fingerprint = JSON.stringify(input)

      if (heldRef.current?.fingerprint !== fingerprint)
        heldRef.current = { fingerprint, key: crypto.randomUUID() }

      return heldRef.current.key
    },
    settled: (error?: Error) => {
      if (!error || !keepsKey(error))
        heldRef.current = undefined
    },
  }
}
