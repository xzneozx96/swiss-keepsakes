import type { Access } from '@sk/domain/identity'
import type { Logger } from 'pino'
import type { Database } from '../../src/platform/db/client.ts'
import type { CommandDeps } from '../../src/platform/http/app.ts'
import { registerIdentityRoutes } from '../../src/modules/identity/adapters/routes.ts'
import { systemClock } from '../../src/platform/clock.ts'
import { createApp } from '../../src/platform/http/app.ts'
import { idempotency, idempotencyActor } from '../../src/platform/http/idempotency.ts'
import { createLogger } from '../../src/platform/logger.ts'
import { noCommands } from './commands.ts'
import { createFakeIdentityUseCases } from './identity-use-cases.ts'

const userCookie = /(?:^|;\s*)sk-test-user=([^;]+)/

export const shopOrigin = 'https://shop.example'

const routes: CommandDeps['routes'] = [app => registerIdentityRoutes(app, createFakeIdentityUseCases())]

// The default: no Idempotency-Key check, so a test of a guard or of the Origin rule sends no key.
export const guardedCommands: CommandDeps = { ...noCommands, routes }

// The real Idempotency-Key middleware over no database. A request without a key is answered before it reads
// one, which is what these tests send, and one with a key would fail loudly.
export const strictCommands: CommandDeps = {
  idempotency: idempotency({ db: {} as Database, clock: systemClock, actorId: idempotencyActor }),
  routes,
}

export const noAccess: Access = { platformAdmin: false, memberships: [] }

// The real createApp over stand-ins for Better Auth and the identity tables. A request is signed in as the user
// named by its `sk-test-user` cookie, and what that user may do comes from `people`. Everything after the
// session, the Origin rule, `authenticate`, the guards, `can()`, is the real code.
export function createGuardedApp(people: Record<string, Access> = {}, logger: Logger = createLogger('silent'), commands: CommandDeps = guardedCommands) {
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
  }, commands)
  return { app, calls }
}

export const signedInAs = (userId: string) => ({ Cookie: `sk-test-user=${userId}` })
