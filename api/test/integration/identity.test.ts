import type { Outsider } from '../support/permission-matrix.ts'
import { randomUUID } from 'node:crypto'
import { createRoute, z } from '@hono/zod-openapi'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { openApiDocument } from '../../scripts/contract.ts'
import { createActorLoader } from '../../src/modules/identity/adapters/actor-repository.ts'
import { platformAdmins, storeMemberships } from '../../src/modules/identity/adapters/schema.ts'
import { createApp } from '../../src/platform/http/app.ts'
import { createSigningKey, signToken, testAuthentication } from '../support/identity.ts'
import { createManualClock } from '../support/manual-clock.ts'
import { outsiderAnswers, outsiderOutcomes, storeOperations, storeUrl } from '../support/permission-matrix.ts'
import { count, openTestDatabase, silentLogger } from './support.ts'

const { pool, db } = openTestDatabase()
const loadActor = createActorLoader(db)
const clock = createManualClock(new Date('2026-10-20T08:00:00Z'))

// Fresh ids per run, because test files share one database.
const lucerne = randomUUID()
const zug = randomUUID()
const userIds: Record<Outsider | 'owner' | 'manager', string> = {
  owner: randomUUID(),
  manager: randomUUID(),
  guest: randomUUID(),
  superAdmin: randomUUID(),
  ownerElsewhere: randomUUID(),
  managerElsewhere: randomUUID(),
}
let key: Awaited<ReturnType<typeof createSigningKey>>

beforeAll(async () => {
  key = await createSigningKey()
  const acceptedAt = clock.now()
  await db.insert(storeMemberships).values([
    { userId: userIds.owner, storeId: lucerne, role: 'owner', acceptedAt },
    { userId: userIds.owner, storeId: zug, role: 'manager', acceptedAt },
    { userId: userIds.manager, storeId: lucerne, role: 'manager', acceptedAt },
    { userId: userIds.ownerElsewhere, storeId: zug, role: 'owner', acceptedAt },
    { userId: userIds.managerElsewhere, storeId: zug, role: 'manager', acceptedAt },
    // A Super Admin who is also staff of Lucerne still gets no store role.
    { userId: userIds.superAdmin, storeId: lucerne, role: 'owner', acceptedAt },
  ])
  await db.insert(platformAdmins).values({ userId: userIds.superAdmin })
})

afterAll(() => pool.end())

describe('[E2.2] the identity tables', () => {
  it('[E2.2] the migration creates identity.store_memberships and identity.platform_admins without any foreign key, and this database has no neon_auth schema', async () => {
    const { rows } = await pool.query<{ table_name: string }>(`select table_name from information_schema.tables where table_schema = 'identity' order by table_name`)

    expect(rows.map(row => row.table_name)).toEqual(['platform_admins', 'store_memberships'])
    expect(await count(pool, `select count(*) from information_schema.table_constraints where table_schema = 'identity' and constraint_type = 'FOREIGN KEY'`)).toBe(0)
    expect(await count(pool, `select count(*) from information_schema.schemata where schema_name = 'neon_auth'`)).toBe(0)
  })

  it('[E2.2] a membership role is owner or manager, and one user has one role per store', async () => {
    const userId = randomUUID()
    const insert = (role: string) => pool.query('insert into identity.store_memberships (user_id, store_id, role, accepted_at) values ($1, $2, $3, now())', [userId, lucerne, role])

    await expect(insert('admin')).rejects.toMatchObject({ code: '23514', constraint: 'store_memberships_role_check' })
    await insert('manager')
    await expect(insert('owner')).rejects.toMatchObject({ code: '23505' })
  })
})

describe('[E2.2][AC02] the actor loaded from the identity tables', () => {
  it('[E2.2][AC02] staff get each store\'s role', async () => {
    expect(await loadActor(userIds.owner)).toEqual({ kind: 'staff', userId: userIds.owner, stores: new Map([[lucerne, 'owner'], [zug, 'manager']]) })
  })

  it('[E2.2][AC02] a platform_admins row makes the Super Admin', async () => {
    expect(await loadActor(userIds.superAdmin)).toEqual({ kind: 'super_admin', userId: userIds.superAdmin })
  })

  it('[E2.2][AC02] a user with no rows, such as a new guest, is a guest', async () => {
    expect(await loadActor(userIds.guest)).toEqual({ kind: 'guest', userId: userIds.guest })
  })
})

describe('[E2.2][AC02] store routes over the real identity tables', () => {
  // The real app with a test-only store route, real tokens and the Drizzle actor loader.
  function appWithStoreRoute() {
    const app = createApp(silentLogger, async () => ({ database: true, jobs: true }), { ...testAuthentication([key.jwk], clock), loadActor })
    const route = createRoute({
      method: 'get',
      path: '/api/store/{storeId}/probe',
      responses: { 200: { description: 'Done', content: { 'application/json': { schema: z.object({ role: z.string() }) } } } },
    })
    app.openapi(route, (c) => {
      const actor = c.get('actor')
      return c.json({ role: actor.kind === 'staff' ? actor.stores.get(c.req.param('storeId')) ?? 'none' : 'none' }, 200)
    })
    return app
  }

  it('[E2.2][AC02] the generated matrix refuses everyone outside Lucerne', async () => {
    const app = appWithStoreRoute()
    const operations = storeOperations(openApiDocument(app))

    expect(operations).toHaveLength(1)
    for (const operation of operations)
      expect(await outsiderAnswers(app, operation, lucerne, key, clock, userIds)).toEqual(outsiderOutcomes.map(({ who, status, type }) => ({ who, status, type })))
  })

  it.each([['owner', 'owner'], ['manager', 'manager']] as const)('[E2.2][AC02] the %s of Lucerne gets through with role %s', async (who, role) => {
    const app = appWithStoreRoute()
    const response = await app.request(storeUrl('/api/store/{storeId}/probe', lucerne), { headers: { Authorization: `Bearer ${await signToken(key, clock, { sub: userIds[who] })}` } })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ role })
  })

  it('[E2.2][AC02] a store id that is not a uuid gets 403, not a database error', async () => {
    const app = appWithStoreRoute()
    const response = await app.request('/api/store/lucerne/probe', { headers: { Authorization: `Bearer ${await signToken(key, clock, { sub: userIds.owner })}` } })

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ type: 'forbidden' })
  })
})
