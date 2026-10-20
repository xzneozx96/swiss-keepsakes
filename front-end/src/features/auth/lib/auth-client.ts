import { createAuthClient } from 'better-auth/client'
import { emailOTPClient } from 'better-auth/client/plugins'

/**
 * Better Auth's client for the API on this origin (/api/auth/*). The session is an HttpOnly cookie the
 * browser sends by itself, so the client holds no token and sends no Authorization header. Only
 * `auth-api.ts` imports this file, and only through `import()`, so none of it is in the first load.
 */
export function createSkAuthClient() {
  return createAuthClient({
    baseURL: window.location.origin,
    plugins: [emailOTPClient()],
  })
}

export type SkAuthClient = ReturnType<typeof createSkAuthClient>
