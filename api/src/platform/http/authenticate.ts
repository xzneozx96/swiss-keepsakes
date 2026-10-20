import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from './app.ts'

// The actor of a request. E2.10 adds staff, partner and super admin beside these two (architecture section 9).
export type Actor
  = | { kind: 'anonymous' }
    | { kind: 'guest', userId: string, guestId: string }

// What the middleware needs from Better Auth. `auth.api.getSession` fits it. With returnHeaders the answer
// carries the Set-Cookie header of a session that Better Auth refreshed (`updateAge`), which has to reach the
// browser or its cookie still dies 7 days after sign-in.
export interface SessionReader {
  (headers: Headers): Promise<{ headers: Headers, response: { user: { id: string } } | null }>
}

export interface AuthenticateDeps {
  readSession: SessionReader
  ensureGuestProfile: (authUserId: string) => Promise<string>
}

// Reads the session on every /api/* request except Better Auth's own routes and sets the actor. No session,
// and an expired or revoked one, is anonymous. A route that needs a session refuses an anonymous actor.
export function authenticate({ readSession, ensureGuestProfile }: AuthenticateDeps): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (c.req.path.startsWith('/api/auth/')) {
      await next()
      return
    }
    const { headers, response } = await readSession(c.req.raw.headers)
    if (!response) {
      c.set('actor', { kind: 'anonymous' })
      await next()
      return
    }
    c.set('actor', { kind: 'guest', userId: response.user.id, guestId: await ensureGuestProfile(response.user.id) })
    for (const cookie of headers.getSetCookie())
      c.header('Set-Cookie', cookie, { append: true })
    await next()
  }
}
