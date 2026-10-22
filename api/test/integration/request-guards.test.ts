import type { Pool } from 'pg'
import { randomUUID } from 'node:crypto'
import { createRoute, z } from '@hono/zod-openapi'
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest'
import { openApiDocument } from '../../scripts/contract.ts'
import { createAccessRepository } from '../../src/modules/identity/adapters/access-repository.ts'
import { createGuestProfileRepository } from '../../src/modules/identity/adapters/guest-profile-repository.ts'
import { registerIdentityRoutes } from '../../src/modules/identity/adapters/routes.ts'
import { makeLoadIdentity } from '../../src/modules/identity/index.ts'
import { createMailQueues } from '../../src/modules/notifications/adapters/jobs.ts'
import { createSentMailRepository } from '../../src/modules/notifications/adapters/sent-mail-repository.ts'
import { makeQueueMail } from '../../src/modules/notifications/application/queue-mail.ts'
import { createAuth, createSessionReader, ownOrigin } from '../../src/platform/auth.ts'
import { systemClock } from '../../src/platform/clock.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { createApp } from '../../src/platform/http/app.ts'
import { idempotency, idempotencyActor } from '../../src/platform/http/idempotency.ts'
import { startJobs } from '../../src/platform/jobs/boss.ts'
import { createJobQueue } from '../../src/platform/jobs/queue.ts'
import { createIdentityWiring, insertStore } from '../support/identity-wiring.ts'
import { callAs, expectedOutsiderAnswers, outsiderAnswers, refusedToTheOwner, storeOperations, storeUrl, unlistedStoreRoutes } from '../support/permission-matrix.ts'
import { openTestDatabase, silentLogger } from './support.ts'

const { pool, db } = openTestDatabase()
let jobs: Awaited<ReturnType<typeof startJobs>>

const baseUrl = 'http://localhost:5173'
const origin = ownOrigin(baseUrl)
// A placeholder of the right length, not a secret.
const secret = 'test-only-secret-0123456789-abcdefghij'

// Fresh ids per run, because test files share one database.
const lucerne = randomUUID()
const zug = randomUUID()

beforeAll(async () => {
  jobs = await startJobs(inject('databaseUrlUnpooled'), false, silentLogger)
})

afterAll(async () => {
  await jobs.stop()
  await pool.end()
})

function randomIp() {
  const octet = () => Math.floor(Math.random() * 250) + 1
  return `198.51.${octet()}.${octet()}`
}

const ok = { 200: { description: 'Done', content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } } } }

// The wiring of main.ts, with test-only routes added the way a module adds its own.
async function setup() {
  const queues = { send: `mail-e2-10-${randomUUID().slice(0, 8)}`, failed: `mail-failed-e2-10-${randomUUID().slice(0, 8)}` }
  await createMailQueues(jobs.boss, queues)
  const uow = createUnitOfWork(db)
  const queueMail = makeQueueMail({ sentMail: createSentMailRepository(), jobs: createJobQueue(jobs.boss), clock: systemClock, queue: queues.send })
  const auth = createAuth({
    db,
    baseUrl,
    secret,
    sendSignInCode: async ({ email, code, language }) => {
      await uow.run(tx => queueMail(tx, { template: 'N01', to: email, language, storeId: null, params: { shop: 'Swiss Keepsakes', code } }))
    },
    logger: silentLogger,
  })
  const { useCases } = createIdentityWiring({ db, queueMail })
  const app = createApp(silentLogger, async () => ({ database: true, jobs: true }), {
    authHandler: auth.handler,
    origin: ownOrigin(baseUrl),
    readSession: createSessionReader(auth),
    loadIdentity: makeLoadIdentity({ uow, profiles: createGuestProfileRepository(), access: createAccessRepository() }),
  }, {
    idempotency: idempotency({ db, clock: systemClock, actorId: idempotencyActor }),
    routes: [routes => registerIdentityRoutes(routes, useCases)],
  })
  app.openapi(createRoute({ method: 'get', path: '/api/store/{storeId}/probe', request: { params: z.object({ storeId: z.uuid() }) }, responses: ok }), c => c.json({ ok: true }, 200))
  app.openapi(createRoute({ method: 'delete', path: '/api/store/{storeId}', request: { params: z.object({ storeId: z.uuid() }) }, responses: ok }), c => c.json({ ok: true }, 200))
  app.openapi(createRoute({
    method: 'post',
    path: '/api/store/{storeId}/orders/{orderId}/accept',
    request: { params: z.object({ storeId: z.uuid(), orderId: z.uuid() }), body: { required: true, content: { 'application/json': { schema: z.object({ pickupDate: z.iso.date() }) } } } },
    responses: ok,
  }), c => c.json({ ok: true }, 200))

  async function call(path: string, init: { method?: string, headers?: Record<string, string>, body?: object } = {}) {
    const method = init.method ?? 'GET'
    const headers: Record<string, string> = { 'fly-client-ip': randomIp(), ...(method === 'GET' ? {} : { Origin: origin }), ...init.headers }
    if (init.body)
      headers['Content-Type'] = 'application/json'
    return app.request(`${baseUrl}${path}`, { method, headers, body: init.body ? JSON.stringify(init.body) : undefined })
  }

  // The real sign-in of E2.2: the code from the queued N01 job, then Better Auth's session cookie.
  async function signIn(label: string) {
    const address = `${label}-${randomUUID().slice(0, 8)}@example.ch`
    await call('/api/auth/email-otp/send-verification-otp', { method: 'POST', body: { email: address, type: 'sign-in' } })
    const { rows } = await pool.query<{ data: { params: { code: string } } }>(`select data from pgboss.job where name = $1 and data->>'to' = $2`, [queues.send, address])
    const response = await call('/api/auth/sign-in/email-otp', { method: 'POST', body: { email: address, otp: rows[0]?.data.params.code } })
    const { user } = await response.json() as { user: { id: string } }
    const cookie = response.headers.getSetCookie().map(line => line.split(';')[0]).join('; ')
    return { userId: user.id, headers: { Cookie: cookie } }
  }

  return { app, call, signIn }
}

async function addMembership(pool: Pool, userId: string, storeId: string, role: string) {
  await insertStore(pool, storeId)
  await pool.query('insert into identity.store_memberships (user_id, store_id, role, accepted_at) values ($1, $2, $3, now())', [userId, storeId, role])
}

describe('[E2.10] the identity tables of migration 0003', () => {
  it('[E2.10][E2.3] store_memberships and platform_admins exist, with no foreign key to Better Auth\'s user row, and a membership\'s store_id points at stores', async () => {
    const { rows } = await pool.query<{ table_name: string }>(`select table_name from information_schema.tables where table_schema = 'identity' and table_name in ('store_memberships', 'platform_admins') order by table_name`)
    const { rows: keys } = await pool.query<{ table_name: string, column_name: string, references_table: string }>(`
      select tc.table_name, kcu.column_name, ccu.table_name as references_table
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu using (constraint_schema, constraint_name)
      join information_schema.constraint_column_usage ccu using (constraint_schema, constraint_name)
      where tc.table_schema = 'identity' and tc.constraint_type = 'FOREIGN KEY' and tc.table_name in ('store_memberships', 'platform_admins')`)

    expect(rows.map(row => row.table_name)).toEqual(['platform_admins', 'store_memberships'])
    expect(keys).toEqual([{ table_name: 'store_memberships', column_name: 'store_id', references_table: 'stores' }])
  })

  it('[E2.10] a membership role is owner or manager, and one user has one role per store', async () => {
    const userId = randomUUID()
    const store = randomUUID()
    await insertStore(pool, store)
    const insert = (role: string) => pool.query('insert into identity.store_memberships (user_id, store_id, role, accepted_at) values ($1, $2, $3, now())', [userId, store, role])

    await expect(insert('admin')).rejects.toMatchObject({ code: '23514', constraint: 'store_memberships_role_check' })
    await insert('manager')
    await expect(insert('owner')).rejects.toMatchObject({ code: '23505', constraint: 'store_memberships_user_id_store_id_unique' })
  })

  it('[E2.10] a membership gets a UUIDv7 id, and a Super Admin is one row per user', async () => {
    const userId = randomUUID()
    await addMembership(pool, userId, randomUUID(), 'owner')
    const { rows } = await pool.query<{ version: number }>(`select uuid_extract_version(id) as version from identity.store_memberships where user_id = $1`, [userId])
    await pool.query('insert into identity.platform_admins (user_id) values ($1)', [userId])

    expect(rows).toEqual([{ version: 7 }])
    await expect(pool.query('insert into identity.platform_admins (user_id) values ($1)', [userId])).rejects.toMatchObject({ code: '23505' })
  })

  it('[E2.10] a Super Admin row records when it was made and who granted it, which is null for the first grant', async () => {
    const first = randomUUID()
    const second = randomUUID()
    await pool.query('insert into identity.platform_admins (user_id) values ($1)', [first])
    await pool.query('insert into identity.platform_admins (user_id, granted_by) values ($1, $2)', [second, first])
    const { rows } = await pool.query<{ user_id: string, granted_by: string | null, recent: boolean }>(`select user_id, granted_by, created_at > now() - interval '1 minute' as recent from identity.platform_admins where user_id in ($1, $2)`, [first, second])
    const { rows: columns } = await pool.query<{ column_name: string, data_type: string, is_nullable: string }>(`select column_name, data_type, is_nullable from information_schema.columns where table_schema = 'identity' and table_name = 'platform_admins' order by column_name`)

    expect(rows.find(row => row.user_id === first)).toMatchObject({ granted_by: null, recent: true })
    expect(rows.find(row => row.user_id === second)).toMatchObject({ granted_by: first, recent: true })
    expect(columns).toEqual([
      { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'NO' },
      { column_name: 'granted_by', data_type: 'uuid', is_nullable: 'YES' },
      { column_name: 'user_id', data_type: 'uuid', is_nullable: 'NO' },
    ])
  })

  it('[E2.10] the access repository reads one user\'s roles across stores', async () => {
    const uow = createUnitOfWork(db)
    const loadIdentity = makeLoadIdentity({ uow, profiles: createGuestProfileRepository(), access: createAccessRepository() })
    const loadAccess = async (userId: string) => (await loadIdentity(userId)).access
    const both = randomUUID()
    const admin = randomUUID()
    await addMembership(pool, both, lucerne, 'owner')
    await addMembership(pool, both, zug, 'manager')
    await pool.query('insert into identity.platform_admins (user_id) values ($1)', [admin])

    const access = await loadAccess(both)

    expect(access.platformAdmin).toBe(false)
    expect(access.memberships).toHaveLength(2)
    expect(access.memberships).toEqual(expect.arrayContaining([{ storeId: lucerne, role: 'owner' }, { storeId: zug, role: 'manager' }]))
    expect(await loadAccess(admin)).toEqual({ platformAdmin: true, memberships: [] })
    expect(await loadAccess(randomUUID())).toEqual({ platformAdmin: false, memberships: [] })
  })
})

describe('[E2.10][AC02] the guards over real Better Auth sessions and the real identity tables', () => {
  // One set of sign-ins for the whole block, because each sign-in is two round trips to the database.
  let shared: Awaited<ReturnType<typeof people>>
  beforeAll(async () => {
    shared = await people()
  })

  async function people() {
    const env = await setup()
    const [guest, owner, manager, ownerElsewhere, managerElsewhere, superAdmin] = await Promise.all(['guest', 'owner', 'manager', 'owner-zug', 'manager-zug', 'admin'].map(env.signIn))
    await addMembership(pool, owner!.userId, lucerne, 'owner')
    await addMembership(pool, manager!.userId, lucerne, 'manager')
    await addMembership(pool, ownerElsewhere!.userId, zug, 'owner')
    await addMembership(pool, managerElsewhere!.userId, zug, 'manager')
    // A Super Admin who is also the owner of Lucerne still gets no store role.
    await addMembership(pool, superAdmin!.userId, lucerne, 'owner')
    await pool.query('insert into identity.platform_admins (user_id) values ($1)', [superAdmin!.userId])
    return { ...env, guest: guest!, owner: owner!, manager: manager!, ownerElsewhere: ownerElsewhere!, managerElsewhere: managerElsewhere!, superAdmin: superAdmin! }
  }

  it('[E2.10][AC02] the generated matrix: every /api/store/* operation refuses each outsider, and the store\'s owner and manager get through', async () => {
    const env = shared
    const document = openApiDocument(env.app)
    const operations = storeOperations(document)
    const outsiders = { anonymous: {}, guest: env.guest.headers, superAdmin: env.superAdmin.headers, ownerElsewhere: env.ownerElsewhere.headers, managerElsewhere: env.managerElsewhere.headers }

    expect(operations).toHaveLength(6)
    expect(unlistedStoreRoutes(env.app, document)).toEqual([])
    for (const operation of operations) {
      expect(await outsiderAnswers(env.app, operation, lucerne, outsiders, origin), `${operation.method} ${operation.path}`).toEqual(expectedOutsiderAnswers)
      for (const [who, headers] of [['owner', env.owner.headers], ['manager', env.manager.headers]] as const)
        expect(refusedToTheOwner.has((await callAs(env.app, operation, lucerne, { who, headers }, origin)).status), `${who} ${operation.method} ${operation.path}`).toBe(false)
    }
  // Six operations, each called by five outsiders and two members, and every call is several round trips to a Neon branch.
  }, 120_000)

  it('[E2.10][AC02] a store id in upper case still opens the owner\'s own store', async () => {
    const env = shared
    const upper = storeUrl('/api/store/{storeId}/probe', lucerne.toUpperCase())

    expect((await env.call(upper, { headers: env.owner.headers })).status).toBe(200)
    expect((await env.call(upper, { headers: env.ownerElsewhere.headers })).status).toBe(403)
  })

  it('[E2.10][AC02] removing a membership closes the store on the next request', async () => {
    const env = shared
    const probe = storeUrl('/api/store/{storeId}/probe', lucerne)
    const leaver = await env.signIn('leaver')
    await addMembership(pool, leaver.userId, lucerne, 'manager')

    expect((await env.call(probe, { headers: leaver.headers })).status).toBe(200)
    await pool.query('delete from identity.store_memberships where user_id = $1', [leaver.userId])
    expect((await env.call(probe, { headers: leaver.headers })).status).toBe(403)
  })

  it('[E2.10] /api/admin/* answers 401 to nobody, 403 to a store owner, and 200 to the Super Admin', async () => {
    const env = shared

    expect((await env.call('/api/admin/stores')).status).toBe(401)
    expect((await env.call('/api/admin/stores', { headers: env.owner.headers })).status).toBe(403)
    expect((await env.call('/api/admin/stores', { headers: env.guest.headers })).status).toBe(403)
    expect((await env.call('/api/admin/stores', { headers: env.superAdmin.headers })).status).toBe(200)
  })

  it('[E2.10] /api/me still answers staff and the Super Admin with their guest profile', async () => {
    const env = shared

    for (const who of [env.guest, env.owner, env.superAdmin]) {
      const response = await env.call('/api/me', { headers: who.headers })
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ guestId: expect.any(String) })
    }
  })
})

describe('[E2.10] the Origin rule on the real Better Auth handler, with a real session cookie', () => {
  it('[E2.10] a sign-out from a foreign origin is refused by our rule and leaves the session alive, with no Origin it is refused too', async () => {
    const env = await setup()
    const { headers } = await env.signIn('victim')

    const foreign = await env.call('/api/auth/sign-out', { method: 'POST', body: {}, headers: { ...headers, Origin: 'https://evil.example' } })
    const none = await env.app.request(`${baseUrl}/api/auth/sign-out`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', 'fly-client-ip': randomIp() }, body: '{}' })

    expect(foreign.status).toBe(403)
    expect(await foreign.json()).toMatchObject({ type: 'origin-refused' })
    expect(none.status).toBe(403)
    expect(await none.json()).toMatchObject({ type: 'origin-refused' })
    expect((await env.call('/api/me', { headers })).status).toBe(200)
  })

  it('[E2.10] a form POST from a foreign origin is refused before the form is read', async () => {
    const env = await setup()
    const { headers } = await env.signIn('victim')
    const response = await env.call('/api/auth/sign-out', { method: 'POST', headers: { ...headers, 'Origin': 'https://evil.example', 'Content-Type': 'application/x-www-form-urlencoded' } })

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ type: 'origin-refused' })
    expect((await env.call('/api/me', { headers })).status).toBe(200)
  })

  it('[E2.10] a sign-out from our own origin works, and the old cookie is then refused', async () => {
    const env = await setup()
    const { headers } = await env.signIn('guest')

    expect((await env.call('/api/auth/sign-out', { method: 'POST', body: {}, headers })).status).toBe(200)
    expect((await env.call('/api/me', { headers })).status).toBe(401)
  })
})
