import type { IdentityDeps } from '../../src/platform/http/app.ts'

// For tests of routes that never sign in: Better Auth answers 404 and no request has a session.
export const noSessions: IdentityDeps = {
  authHandler: async () => new Response(null, { status: 404 }),
  origin: 'http://localhost',
  readSession: async () => ({ headers: new Headers(), response: null }),
  loadIdentity: async () => {
    throw new Error('no session, so no identity')
  },
}
