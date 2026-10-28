import type { openTestDatabase } from './support.ts'
import { randomUUID } from 'node:crypto'
import { guardUseCases } from '../../src/modules/content/adapters/database-errors.ts'
import { createMediaRepository } from '../../src/modules/content/adapters/media-repository.ts'
import { createPinRepository } from '../../src/modules/content/adapters/pin-repository.ts'
import { registerContentRoutes } from '../../src/modules/content/adapters/routes.ts'
import { createStoryRepository } from '../../src/modules/content/adapters/story-repository.ts'
import { makeCreatePin, makeCreateStoryGroup, makeCreateStoryVersion, makeDeletePin, makeDeleteStoryVersion, makeHidePin, makeMoveStoryVersion, makePublishPin, makePublishStoryVersion, makeSavePin, makeSaveStoryGroup, makeSaveStoryVersion, makeUnpublishStoryVersion } from '../../src/modules/content/index.ts'
import { createAccessRepository } from '../../src/modules/identity/adapters/access-repository.ts'
import { createGuestProfileRepository } from '../../src/modules/identity/adapters/guest-profile-repository.ts'
import { createMembershipRepository } from '../../src/modules/identity/adapters/membership-repository.ts'
import { makeListMyStores, makeLoadIdentity } from '../../src/modules/identity/index.ts'
import { createAuditLog } from '../../src/platform/audit.ts'
import { createAuth, createSessionReader, ownOrigin } from '../../src/platform/auth.ts'
import { systemClock } from '../../src/platform/clock.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { createApp } from '../../src/platform/http/app.ts'
import { idempotency, idempotencyActor } from '../../src/platform/http/idempotency.ts'
import { createLogger } from '../../src/platform/logger.ts'
import { insertStore } from '../support/identity-wiring.ts'
import { silentLogger } from './support.ts'

// The HTTP app of main.ts over a real database, for the content route tests: Better Auth is the real one, the
// sign-in code goes to a map instead of a mail job, and the Idempotency-Key middleware is the real one.
const baseUrl = 'http://localhost:5173'
const origin = ownOrigin(baseUrl)
// A placeholder of the right length, not a secret.
const secret = 'test-only-secret-0123456789-abcdefghij'

const randomIp = () => `198.51.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`

// The wiring of main.ts over a real database. Better Auth is the real one; the sign-in code goes to a map
// instead of a mail job, so no queue is needed.
export function createContentHttp({ pool, db }: ReturnType<typeof openTestDatabase>) {
  const codes = new Map<string, string>()
  const uow = createUnitOfWork(db)
  const auth = createAuth({
    db,
    baseUrl,
    secret,
    sendSignInCode: async ({ email, code }) => {
      codes.set(email.toLowerCase(), code)
    },
    logger: silentLogger,
  })
  const pinDeps = { uow, pins: createPinRepository(), media: createMediaRepository(), audit: createAuditLog(systemClock), clock: systemClock }
  const storyDeps = { uow, stories: createStoryRepository(), media: createMediaRepository(), audit: createAuditLog(systemClock), clock: systemClock }
  const contentUseCases = guardUseCases({
    createPin: makeCreatePin(pinDeps),
    savePin: makeSavePin(pinDeps),
    publishPin: makePublishPin(pinDeps),
    hidePin: makeHidePin(pinDeps),
    deletePin: makeDeletePin(pinDeps),
    createStoryGroup: makeCreateStoryGroup(storyDeps),
    saveStoryGroup: makeSaveStoryGroup(storyDeps),
    createStoryVersion: makeCreateStoryVersion(storyDeps),
    saveStoryVersion: makeSaveStoryVersion(storyDeps),
    publishStoryVersion: makePublishStoryVersion(storyDeps),
    unpublishStoryVersion: makeUnpublishStoryVersion(storyDeps),
    moveStoryVersion: makeMoveStoryVersion(storyDeps),
    deleteStoryVersion: makeDeleteStoryVersion(storyDeps),
  })
  const app = createApp(createLogger('silent'), async () => ({ database: true, jobs: true }), {
    authHandler: auth.handler,
    origin,
    readSession: createSessionReader(auth),
    loadIdentity: makeLoadIdentity({ uow, profiles: createGuestProfileRepository(), access: createAccessRepository() }),
    listMyStores: makeListMyStores({ uow, memberships: createMembershipRepository() }),
  }, {
    idempotency: idempotency({ db, clock: systemClock, actorId: idempotencyActor }),
    routes: [routes => registerContentRoutes(routes, contentUseCases)],
  })

  async function call(path: string, init: { method?: string, headers?: Record<string, string>, body?: object, key?: string | null } = {}) {
    const method = init.method ?? 'GET'
    const headers: Record<string, string> = { 'fly-client-ip': randomIp(), ...(method === 'GET' ? {} : { Origin: origin }), ...init.headers }
    if (method !== 'GET' && init.key !== null)
      headers['Idempotency-Key'] = init.key ?? randomUUID()
    if (init.body)
      headers['Content-Type'] = 'application/json'
    return app.request(`${baseUrl}${path}`, { method, headers, body: init.body ? JSON.stringify(init.body) : undefined })
  }

  // The real sign-in of E2.2, then Better Auth's session cookie.
  async function signIn() {
    const email = `person-${randomUUID().slice(0, 8)}@example.ch`
    await call('/api/auth/email-otp/send-verification-otp', { method: 'POST', body: { email, type: 'sign-in' }, key: null })
    const response = await call('/api/auth/sign-in/email-otp', { method: 'POST', body: { email, otp: codes.get(email) }, key: null })
    const { user } = await response.json() as { user: { id: string } }
    return { userId: user.id, headers: { Cookie: response.headers.getSetCookie().map(line => line.split(';')[0]).join('; ') } }
  }

  // A live store with its owner and its manager signed in.
  async function storeWithStaff() {
    const storeId = randomUUID()
    await insertStore(pool, storeId, 'live')
    const [owner, manager] = await Promise.all([signIn(), signIn()])
    await pool.query(`insert into identity.store_memberships (user_id, store_id, role, accepted_at) values ($1, $2, 'owner', now()), ($3, $2, 'manager', now())`, [owner.userId, storeId, manager.userId])
    return { storeId, owner, manager, pins: `/api/store/${storeId}/pins`, groups: `/api/store/${storeId}/story-groups` }
  }

  return { call, signIn, storeWithStaff }
}
