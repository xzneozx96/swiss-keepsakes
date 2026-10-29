import type { Access } from '@sk/domain/identity'
import type { ContentUseCases } from '../../../src/modules/content/adapters/routes.ts'
import { describe, expect, it } from 'vitest'
import { registerContentRoutes } from '../../../src/modules/content/adapters/routes.ts'
import { createFakeContentUseCases, fakeCategory } from '../../support/fake-content-use-cases.ts'
import { createGuardedApp, guardedCommands, noAccess, shopOrigin, signedInAs, strictCommands } from '../../support/guarded-app.ts'

const lucerne = '0190f0c2-0000-7000-8000-00000000000a'
const zug = '0190f0c2-0000-7000-8000-00000000000b'
const categoryId = '0190f0c2-0000-7000-8000-0000000000d1'

const people: Record<string, Access> = {
  owner: { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'owner' }] },
  manager: { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'manager' }] },
  ownerElsewhere: { platformAdmin: false, memberships: [{ storeId: zug, role: 'owner' }] },
  guest: noAccess,
}

function setup(overrides: Partial<ContentUseCases> = {}) {
  const useCases = { ...createFakeContentUseCases(), ...overrides }
  const { app } = createGuardedApp(people, undefined, { ...guardedCommands, routes: [routes => registerContentRoutes(routes, useCases)] })
  return app
}

const base = `/api/store/${lucerne}/categories`
const one = `${base}/map/${categoryId}`

function send(app: ReturnType<typeof setup>, method: string, path: string, headers: Record<string, string> = {}, body?: object) {
  return app.request(path, {
    method,
    headers: { 'Origin': shopOrigin, 'Content-Type': 'application/json', ...signedInAs('owner'), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('[E4.18][AC87] the category routes', () => {
  it('lists with the use case called for the verified store and kind', async () => {
    const seen: unknown[] = []
    const app = setup({ listMerchantCategories: async (actor, storeId, kind) => {
      seen.push([actor.kind, storeId, kind])
      return { ok: true, value: [{ ...fakeCategory, storeId }] }
    } })

    const response = await send(app, 'GET', `${base}/blog`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ items: [{ id: fakeCategory.id, slug: 'walks', name: { en: 'Walks', de: null }, parentId: null, position: 1, childCount: 0, useCount: 0 }] })
    expect(seen).toEqual([['staff', lucerne, 'blog']])
  })

  it('creates: 201 with the category, and the body reaches the use case', async () => {
    const seen: unknown[] = []
    const app = setup({ createCategory: async (_actor, storeId, kind, input, requestId) => {
      seen.push([storeId, kind, input, typeof requestId])
      return { ok: true, value: { ...fakeCategory, storeId } }
    } })

    const response = await send(app, 'POST', `${base}/map`, {}, { name: { en: 'Walks', de: '' }, parentId: categoryId })

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ id: fakeCategory.id, slug: 'walks' })
    expect(seen).toEqual([[lucerne, 'map', { name: { en: 'Walks', de: '' }, parentId: categoryId }, 'string']])
  })

  it('saves: 200 with the category', async () => {
    const seen: unknown[] = []
    const app = setup({ saveCategory: async (_actor, storeId, kind, id, input) => {
      seen.push([storeId, kind, id, input])
      return { ok: true, value: { ...fakeCategory, id } }
    } })

    const response = await send(app, 'PATCH', one, {}, { parentId: null })

    expect(response.status).toBe(200)
    expect(seen).toEqual([[lucerne, 'map', categoryId, { parentId: null }]])
  })

  it('reorders: PUT .../order is not read as a category id, and answers 200 with items', async () => {
    const seen: unknown[] = []
    const app = setup({ reorderCategories: async (_actor, storeId, kind, input) => {
      seen.push([storeId, kind, input])
      return { ok: true, value: [fakeCategory] }
    } })

    const response = await send(app, 'PUT', `${base}/map/order`, {}, { parentId: null, ids: [categoryId] })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ items: [{ id: fakeCategory.id }] })
    expect(seen).toEqual([[lucerne, 'map', { parentId: null, ids: [categoryId] }]])
  })

  it('deletes: 204 with no body, and no If-Match is needed', async () => {
    const response = await send(setup(), 'DELETE', one)

    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
  })

  it.each([
    ['a kind that is neither map nor blog', 'GET', `${base}/shop`, undefined],
    ['a category id that is not a uuid', 'DELETE', `${base}/map/not-a-uuid`, undefined],
    ['an empty patch', 'PATCH', one, {}],
    ['an unknown key on create', 'POST', `${base}/map`, { name: { en: 'x' }, slug: 'mine' }],
    ['a parent that is not a uuid', 'POST', `${base}/map`, { name: { en: 'x' }, parentId: 'nope' }],
    ['a create with no name', 'POST', `${base}/map`, {}],
    ['an order body with a non-uuid id', 'PUT', `${base}/map/order`, { parentId: null, ids: ['x'] }],
  ])('%s answers 400 validation-failed and no use case runs', async (_name, method, path, body) => {
    let calls = 0
    const track = async () => {
      calls++
      return { ok: false, reason: 'not-found' } as const
    }
    const app = setup({ listMerchantCategories: track, createCategory: track, saveCategory: track, reorderCategories: track, deleteCategory: track })

    const response = await send(app, method, path, {}, body)

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ type: 'validation-failed' })
    expect(calls).toBe(0)
  })

  it.each([
    ['name-missing', 422, 'validation-failed'],
    ['order-mismatch', 422, 'validation-failed'],
    ['not-found', 404, 'not-found'],
    ['category-has-children', 409, 'category-has-children'],
    ['category-in-use', 409, 'category-in-use'],
    ['category-too-deep', 409, 'category-too-deep'],
    ['category-parent-has-children', 409, 'category-parent-has-children'],
  ] as const)('a %s failure answers %i %s', async (reason, status, type) => {
    const app = setup({ deleteCategory: async () => ({ ok: false, reason }) })

    const response = await send(app, 'DELETE', one)

    expect(response.status).toBe(status)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await response.json()).toMatchObject({ type })
  })

  it('a name-missing failure names the name field', async () => {
    const app = setup({ createCategory: async () => ({ ok: false, reason: 'name-missing' }) })

    const response = await send(app, 'POST', `${base}/map`, {}, { name: { en: ' ' } })

    expect(await response.json()).toMatchObject({ errors: [{ in: 'body', path: 'name' }] })
  })

  it('a category write with no Idempotency-Key is refused', async () => {
    const { app } = createGuardedApp(people, undefined, { ...strictCommands, routes: [routes => registerContentRoutes(routes, createFakeContentUseCases())] })

    const response = await app.request(`${base}/map`, { method: 'POST', headers: { 'Origin': shopOrigin, 'Content-Type': 'application/json', ...signedInAs('owner') }, body: JSON.stringify({ name: { en: 'x' } }) })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ type: 'idempotency-key-required' })
  })
})

describe('[E4.18][AC87] AC-6 who may use the category routes', () => {
  const routes = [
    ['GET', `${base}/map`, undefined],
    ['POST', `${base}/blog`, { name: { en: 'x' } }],
    ['PATCH', one, { parentId: null }],
    ['PUT', `${base}/map/order`, { parentId: null, ids: [] }],
    ['DELETE', one, undefined],
  ] as const

  it.each(routes)('a member of another store, a user with no membership and an anonymous caller get 403, 403 and 401 on %s %s', async (method, path, body) => {
    const calls: string[] = []
    const track = (name: string) => async () => {
      calls.push(name)
      return { ok: false, reason: 'not-found' } as const
    }
    const app = setup({ listMerchantCategories: track('list'), createCategory: track('create'), saveCategory: track('save'), reorderCategories: track('reorder'), deleteCategory: track('delete') })
    const as = (who: Record<string, string>) => app.request(path, { method, headers: { 'Origin': shopOrigin, 'Content-Type': 'application/json', ...who }, body: body ? JSON.stringify(body) : undefined })

    expect((await as(signedInAs('ownerElsewhere'))).status).toBe(403)
    expect((await as(signedInAs('guest'))).status).toBe(403)
    expect((await as({})).status).toBe(401)
    expect(calls).toEqual([])
  })

  it.each(['owner', 'manager'])('the %s of the store reaches the use case', async (who) => {
    const response = await send(setup(), 'POST', `${base}/map`, signedInAs(who), { name: { en: 'x' } })

    expect(response.status).toBe(201)
  })
})
