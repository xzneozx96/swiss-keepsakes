import type { Tx } from '../../src/platform/db/client.ts'
import type { openTestDatabase } from './support.ts'
import { randomUUID } from 'node:crypto'
import { guardUseCases } from '../../src/modules/catalog/adapters/database-errors.ts'
import { createMediaDirectory } from '../../src/modules/catalog/adapters/media-directory.ts'
import { createProductRepository } from '../../src/modules/catalog/adapters/product-repository.ts'
import { registerCatalogRoutes } from '../../src/modules/catalog/adapters/routes.ts'
import { makeCreateProduct, makeCreateVariant, makeGetProduct, makeListProducts, makePublishProduct, makeSaveOptions, makeSaveProduct, makeSaveVariant, makeUnpublishProduct } from '../../src/modules/catalog/index.ts'
import { createMediaRepository } from '../../src/modules/content/adapters/media-repository.ts'
import { mediaView } from '../../src/modules/content/adapters/media-view.ts'
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
import { createFakeStorage } from '../support/fake-storage.ts'
import { insertStore } from '../support/identity-wiring.ts'
import { silentLogger } from './support.ts'

// The catalog routes of main.ts over a real database, with the real Better Auth and Idempotency-Key middleware.
// The sign-in code goes to a map instead of a mail job.
const baseUrl = 'http://localhost:5173'
const origin = ownOrigin(baseUrl)
// A placeholder of the right length, not a secret.
const secret = 'test-only-secret-0123456789-abcdefghij'

const randomIp = () => `198.51.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`

// `slugsTaken` replaces the slug read, so a test can make two publishes read the same slug as free (the race).
export function createCatalogHttp({ pool, db }: ReturnType<typeof openTestDatabase>, options: { slugsTaken?: () => Set<string> } = {}) {
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
  const storage = createFakeStorage(systemClock)
  const contentMedia = createMediaRepository()
  const deps = {
    uow,
    products: options.slugsTaken ? { ...createProductRepository(), slugsTaken: async () => options.slugsTaken!() } : createProductRepository(),
    media: createMediaDirectory({ findById: (tx: Tx, storeId: string, id: string) => contentMedia.findById(tx, storeId, id), view: row => mediaView(row, storage.publicUrl) }),
    audit: createAuditLog(systemClock),
    clock: systemClock,
  }
  const useCases = guardUseCases({
    listProducts: makeListProducts(deps),
    getProduct: makeGetProduct(deps),
    createProduct: makeCreateProduct(deps),
    saveProduct: makeSaveProduct(deps),
    publishProduct: makePublishProduct(deps),
    unpublishProduct: makeUnpublishProduct(deps),
    saveVariant: makeSaveVariant(deps),
    saveOptions: makeSaveOptions(deps),
    createVariant: makeCreateVariant(deps),
  })
  const app = createApp(createLogger('silent'), async () => ({ database: true, jobs: true }), {
    authHandler: auth.handler,
    origin,
    readSession: createSessionReader(auth),
    loadIdentity: makeLoadIdentity({ uow, profiles: createGuestProfileRepository(), access: createAccessRepository() }),
    listMyStores: makeListMyStores({ uow, memberships: createMembershipRepository() }),
  }, {
    idempotency: idempotency({ db, clock: systemClock, actorId: idempotencyActor }),
    routes: [routes => registerCatalogRoutes(routes, useCases)],
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
    return { storeId, owner, manager, products: `/api/store/${storeId}/products` }
  }

  // A photo of the store that the worker finished: `ready`, with a size.
  async function readyPhoto(storeId: string, status: 'ready' | 'processing' | 'retired' = 'ready') {
    const id = randomUUID()
    await pool.query(
      `insert into content.media (id, store_id, kind, storage_key, content_type, byte_size, sha256, width, height, status, retired_at)
       values ($1, $2, 'image', $3, 'image/jpeg', 1000, $4, $5, $6, $7, $8)`,
      [id, storeId, `${storeId}/${id}/original.jpg`, 'a'.repeat(64), status === 'ready' || status === 'retired' ? 1280 : null, status === 'ready' || status === 'retired' ? 960 : null, status, status === 'retired' ? new Date() : null],
    )
    return id
  }

  return { call, signIn, storeWithStaff, readyPhoto }
}
