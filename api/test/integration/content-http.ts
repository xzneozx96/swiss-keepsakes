import type { CategoryRepository } from '../../src/modules/content/ports.ts'
import type { Clock } from '../../src/platform/clock.ts'
import type { Tx } from '../../src/platform/db/client.ts'
import type { openTestDatabase } from './support.ts'
import { randomUUID } from 'node:crypto'
import { createCategoryRepository } from '../../src/modules/content/adapters/category-repository.ts'
import { guardUseCases } from '../../src/modules/content/adapters/database-errors.ts'
import { createMediaRepository } from '../../src/modules/content/adapters/media-repository.ts'
import { createPinRepository } from '../../src/modules/content/adapters/pin-repository.ts'
import { createPublicReadRepository } from '../../src/modules/content/adapters/public-repository.ts'
import { registerContentRoutes } from '../../src/modules/content/adapters/routes.ts'
import { createStoryRepository } from '../../src/modules/content/adapters/story-repository.ts'
import { createTourRepository } from '../../src/modules/content/adapters/tour-repository.ts'
import { makeCreateCategory, makeCreatePin, makeCreateStoryGroup, makeCreateStoryVersion, makeCreateTour, makeDeleteCategory, makeDeletePin, makeDeleteStoryVersion, makeDeleteTour, makeGetMap, makeGetPin, makeGetStory, makeGetTour, makeHidePin, makeListCategories, makeListMerchantCategories, makeListStories, makeListTours, makeMoveStoryVersion, makePublishPin, makePublishStoryVersion, makePublishTour, makeReorderCategories, makeSaveCategory, makeSavePin, makeSaveStoryGroup, makeSaveStoryVersion, makeSaveTour, makeUnpublishStoryVersion, makeUnpublishTour } from '../../src/modules/content/index.ts'
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
// `readClock` is the clock of the public reads, so a test can move the map cache's time.
// `categories` lets a test stand in for the category repository (the delete race).
export function createContentHttp({ pool, db }: ReturnType<typeof openTestDatabase>, readClock: Clock = systemClock, categories: CategoryRepository<Tx> = createCategoryRepository()) {
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
  const storyDeps = { uow, stories: createStoryRepository(), media: createMediaRepository(), pins: pinDeps.pins, audit: createAuditLog(systemClock), clock: systemClock }
  const tourDeps = { uow, tours: createTourRepository(), media: createMediaRepository(), audit: createAuditLog(systemClock), clock: systemClock }
  const categoryDeps = { uow, categories, audit: createAuditLog(systemClock), clock: systemClock }
  const readDeps = { uow, reads: createPublicReadRepository(), clock: readClock }
  const writeUseCases = guardUseCases({
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
    createTour: makeCreateTour(tourDeps),
    saveTour: makeSaveTour(tourDeps),
    publishTour: makePublishTour(tourDeps),
    unpublishTour: makeUnpublishTour(tourDeps),
    deleteTour: makeDeleteTour(tourDeps),
    createCategory: makeCreateCategory(categoryDeps),
    saveCategory: makeSaveCategory(categoryDeps),
    reorderCategories: makeReorderCategories(categoryDeps),
    deleteCategory: makeDeleteCategory(categoryDeps),
    listMerchantCategories: makeListMerchantCategories(categoryDeps),
  })
  // The reads fail with an exception, not a Result, so guardUseCases does not fit them: a database error is a 500.
  const contentUseCases = {
    ...writeUseCases,
    listStories: makeListStories(readDeps),
    getStory: makeGetStory(readDeps),
    getPin: makeGetPin(readDeps),
    listTours: makeListTours(readDeps),
    getTour: makeGetTour(readDeps),
    listCategories: makeListCategories(readDeps),
    getMap: makeGetMap(readDeps),
  }
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
    return { storeId, owner, manager, pins: `/api/store/${storeId}/pins`, groups: `/api/store/${storeId}/story-groups`, tours: `/api/store/${storeId}/tours` }
  }

  return { call, signIn, storeWithStaff }
}
