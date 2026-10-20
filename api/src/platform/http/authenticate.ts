import type { Access } from '@sk/domain/identity'
import type { Context, MiddlewareHandler } from 'hono'
import type { AppEnv } from './app.ts'
import { actorFor, anonymous } from '@sk/domain/identity'
import { problem } from './problem.ts'

// What the middleware needs from Better Auth. `auth.api.getSession` fits it. With returnHeaders the answer
// carries the Set-Cookie header of a session that Better Auth refreshed (`updateAge`), which has to reach the
// browser or its cookie still dies 7 days after sign-in.
export interface SessionReader {
  (headers: Headers): Promise<{ headers: Headers, response: { user: { id: string } } | null }>
}

export interface AuthenticateDeps {
  readSession: SessionReader
  // The guest profile id, created on the first call, and the user's roles, read in one transaction.
  loadIdentity: (authUserId: string) => Promise<{ guestId: string, access: Access }>
}

// Reads the session on every /api/* request except Better Auth's own routes and sets the actor: a guest, staff
// with a role per store, or the Super Admin. No session, and an expired or revoked one, is anonymous. A route
// that needs a session refuses an anonymous actor.
export function authenticate({ readSession, loadIdentity }: AuthenticateDeps): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (c.req.path.startsWith('/api/auth/')) {
      await next()
      return
    }
    const { headers, response } = await readSession(c.req.raw.headers)
    // Better Auth's header that clears the cookie of an expired or deleted session passes on with the response, so
    // the browser stops sending it. A renewed cookie goes the same way.
    for (const cookie of headers.getSetCookie())
      c.header('Set-Cookie', cookie, { append: true })
    if (!response) {
      c.set('actor', anonymous)
      await next()
      return
    }
    const userId = response.user.id
    // One transaction, before the request's own unit of work and its Idempotency-Key claim. The roles are read
    // on every request, with no cache, so a removed membership closes the store on the next one.
    const { guestId, access } = await loadIdentity(userId)
    c.set('actor', actorFor({ userId, guestId }, access))
    await next()
  }
}

export interface Guest {
  userId: string
  guestId: string
}

export function unauthenticated(c: Context<AppEnv>) {
  return problem(c, { type: 'unauthenticated', status: 401, title: 'Sign in to continue' })
}

// Default deny for a guarded route: mount it on the route's path, and an anonymous request gets the 401 problem
// before the handler runs. Staff and the Super Admin are signed-in users with a guest profile too. The handler
// reads the guest with `c.get('guest')`.
export const requireGuest: MiddlewareHandler<AppEnv> = async (c, next) => {
  const actor = c.get('actor')
  if (actor.kind === 'anonymous')
    return unauthenticated(c)
  c.set('guest', { userId: actor.userId, guestId: actor.guestId })
  await next()
}
