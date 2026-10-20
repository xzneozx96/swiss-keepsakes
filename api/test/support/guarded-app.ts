import type { Access } from '@sk/domain/identity'
import type { Logger } from 'pino'
import { createApp } from '../../src/platform/http/app.ts'
import { createLogger } from '../../src/platform/logger.ts'

const userCookie = /(?:^|;\s*)sk-test-user=([^;]+)/

export const shopOrigin = 'https://shop.example'

export const noAccess: Access = { platformAdmin: false, memberships: [] }

// The real createApp over stand-ins for Better Auth and the identity tables. A request is signed in as the user
// named by its `sk-test-user` cookie, and what that user may do comes from `people`. Everything after the
// session, the Origin rule, `authenticate`, the guards, `can()`, is the real code.
export function createGuardedApp(people: Record<string, Access> = {}, logger: Logger = createLogger('silent')) {
  const calls = { authHandler: 0, readSession: 0 }
  const app = createApp(logger, async () => ({ database: true, jobs: true }), {
    origin: shopOrigin,
    authHandler: async () => {
      calls.authHandler++
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
    },
    readSession: async (headers) => {
      calls.readSession++
      const userId = userCookie.exec(headers.get('cookie') ?? '')?.[1]
      return { headers: new Headers(), response: userId ? { user: { id: userId } } : null }
    },
    loadIdentity: async userId => ({ guestId: `guest-of-${userId}`, access: people[userId] ?? noAccess }),
  })
  return { app, calls }
}

export const signedInAs = (userId: string) => ({ Cookie: `sk-test-user=${userId}` })
