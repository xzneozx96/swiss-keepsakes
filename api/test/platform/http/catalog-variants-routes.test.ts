import type { Access } from '@sk/domain/identity'
import type { CatalogUseCases } from '../../../src/modules/catalog/adapters/routes.ts'
import { describe, expect, it } from 'vitest'
import { registerCatalogRoutes } from '../../../src/modules/catalog/adapters/routes.ts'
import { createFakeCatalogUseCases } from '../../support/fake-catalog-use-cases.ts'
import { createGuardedApp, guardedCommands, noAccess, shopOrigin, signedInAs } from '../../support/guarded-app.ts'

const lucerne = '0190f0c2-0000-7000-8000-00000000000a'
const productId = '0190f0c2-0000-7000-8000-0000000000c1'
const skuId = '0190f0c2-0000-7000-8000-0000000000c2'

const people: Record<string, Access> = {
  owner: { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'owner' }] },
  guest: noAccess,
}

function setup(overrides: Partial<CatalogUseCases> = {}) {
  const useCases = { ...createFakeCatalogUseCases(), ...overrides }
  return createGuardedApp(people, undefined, { ...guardedCommands, routes: [routes => registerCatalogRoutes(routes, useCases)] }).app
}

const send = (app: ReturnType<typeof setup>, path: string, method: string, body: object, user = 'owner', ifMatch?: string) => app.request(path, {
  method,
  headers: { 'Origin': shopOrigin, 'Content-Type': 'application/json', ...(ifMatch && { 'If-Match': ifMatch }), ...signedInAs(user) },
  body: JSON.stringify(body),
})

describe('[T-008][AC4] PATCH .../variants', () => {
  const path = `/api/store/${lucerne}/products/${productId}/variants`

  it('[T-008][AC4] calls the use case with the verified store and the rows, and answers 200 with the keepsake', async () => {
    const seen: unknown[] = []
    const app = setup({ saveVariants: async (actor, storeId, id, changes) => {
      seen.push([actor.kind, storeId, id, changes])
      return createFakeCatalogUseCases().saveVariants(actor, storeId, id, changes, null)
    } })
    const response = await send(app, path, 'PATCH', { variants: [{ id: skuId, priceRappen: 4100 }, { id: productId, status: 'draft' }] })

    expect(response.status).toBe(200)
    expect(seen).toEqual([['staff', lucerne, productId, [{ id: skuId, priceRappen: 4100 }, { id: productId, status: 'draft' }]]])
    expect(response.headers.get('ETag')).toBeTruthy()
  })

  it('[T-008][AC4] refuses an empty list, a repeated id, a price of 0 and an extra field with 400', async () => {
    const app = setup()

    for (const body of [{ variants: [] }, { variants: [{ id: skuId }, { id: skuId.toUpperCase() }] }, { variants: [{ id: skuId, priceRappen: 0 }] }, { variants: [{ id: skuId, skuCode: 'X' }] }])
      expect((await send(app, path, 'PATCH', body)).status).toBe(400)
  })

  it('[T-008][AC4] a use case refusal is the 422 with the rows named, and a missing variant is 404', async () => {
    const refused = setup({ saveVariants: async () => ({ ok: false, reason: 'refused', refusals: [{ code: 'variant-archived', path: 'variants.0.status', params: { code: 'VX-1' } }] }) })
    const response = await send(refused, path, 'PATCH', { variants: [{ id: skuId, priceRappen: 100 }] })

    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ errors: [{ path: 'variants.0.status', code: 'variant-archived' }] })
    expect((await send(setup({ saveVariants: async () => ({ ok: false, reason: 'not-found' }) }), path, 'PATCH', { variants: [{ id: skuId }] })).status).toBe(404)
  })

  it('[T-008][AC4] a guest of no store is refused before the use case', async () => {
    expect((await send(setup(), path, 'PATCH', { variants: [{ id: skuId }] }, 'guest')).status).toBe(403)
  })
})

describe('[T-008][AC4] PUT .../options with new variants', () => {
  const path = `/api/store/${lucerne}/products/${productId}/options`
  const options = [{ ref: 'size', name: { en: 'Size' }, values: [{ ref: 's', label: { en: 'Small' } }] }]

  it('[T-008][AC4] passes the new variants as for sale, and none as an empty list', async () => {
    const seen: unknown[] = []
    const app = setup({ saveOptions: async (actor, storeId, id, ifMatch, input) => {
      seen.push(input.newVariants)
      return createFakeCatalogUseCases().saveOptions(actor, storeId, id, ifMatch, input, null)
    } })

    expect((await send(app, path, 'PUT', { options, newVariants: [{ skuCode: 'VX-S', priceRappen: 3900, values: { size: 's' } }] }, 'owner', '1')).status).toBe(200)
    expect((await send(app, path, 'PUT', { options }, 'owner', '1')).status).toBe(200)
    expect(seen).toEqual([[{ skuCode: 'VX-S', priceRappen: 3900, status: 'published', values: { size: 's' } }], []])
  })
})
