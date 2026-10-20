import type { SkAuthClient } from './auth-client'

let client: Promise<SkAuthClient> | undefined

/** The auth client, loaded on first use so demo mode and first paint never download it. A failed load is tried again next time. */
export function loadAuthClient(): Promise<SkAuthClient> {
  client ??= import('./auth-client').then(
    module => module.createSkAuthClient(),
    (error: unknown) => {
      client = undefined
      throw error
    },
  )

  return client
}

/** No call to the API waits longer than this. An abort ends the call like a lost connection does. */
export const AUTH_TIMEOUT_MS = 15_000

/**
 * `fetchOptions` for one call to the auth client: a timeout, optional headers, and the seconds Better Auth's rate limiter
 * asks the guest to wait (`X-Retry-After`), handed to `onRetryAfter`.
 */
export function authFetchOptions(
  headers?: Record<string, string>,
  onRetryAfter?: (seconds: number) => void,
) {
  return {
    headers,
    signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    onError: ({ response }: { response: Response }) => {
      const seconds = Number(response.headers.get('x-retry-after'))

      if (Number.isFinite(seconds) && seconds > 0)
        onRetryAfter?.(seconds)
    },
  }
}
