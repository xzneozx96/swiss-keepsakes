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
