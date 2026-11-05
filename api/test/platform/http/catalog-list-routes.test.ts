import type { Access } from '@sk/domain/identity'
import type { CatalogUseCases } from '../../../src/modules/catalog/adapters/routes.ts'
import type { ProductListQuery } from '../../../src/modules/catalog/ports.ts'
import type { InventoryUseCases } from '../../../src/modules/inventory/adapters/routes.ts'
import { describe, expect, it } from 'vitest'
import { registerCatalogRoutes } from '../../../src/modules/catalog/adapters/routes.ts'
import { registerInventoryRoutes } from '../../../src/modules/inventory/adapters/routes.ts'
import { createFakeCatalogUseCases } from '../../support/fake-catalog-use-cases.ts'
import { createFakeInventoryUseCases } from '../../support/fake-inventory-use-cases.ts'
import { createGuardedApp, guardedCommands, noAccess, shopOrigin, signedInAs } from '../../support/guarded-app.ts'

const lucerne = '0190f0c2-0000-7000-8000-00000000000a'
const productId = '0190f0c2-0000-7000-8000-0000000000c1'

const people: Record<string, Access> = {
  owner: { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'owner' }] },
  guest: noAccess,
}

function setup(catalog: Partial<CatalogUseCases> = {}, inventory: Partial<InventoryUseCases> = {}) {
  const catalogCases = { ...createFakeCatalogUseCases(), ...catalog }
  const inventoryCases = { ...createFakeInventoryUseCases(), ...inventory }
  return createGuardedApp(people, undefined, { ...guardedCommands, routes: [routes => registerCatalogRoutes(routes, catalogCases), routes => registerInventoryRoutes(routes, inventoryCases)] }).app
}

const get = (app: ReturnType<typeof setup>, path: string, who = 'owner') => app.request(path, { headers: { Origin: shopOrigin, ...signedInAs(who) } })
const products = `/api/store/${lucerne}/products`
const products_ = products
const inventory = `/api/store/${lucerne}/inventory`

describe('[ADR-033] GET /products', () => {
  it('parses the filters into the query the use case gets, and answers the page with total and status counts', async () => {
    const seen: ProductListQuery[] = []
    const app = setup({ listProducts: async (_actor, _store, query) => {
      seen.push(query)
      return { ok: true, value: { entries: [], total: 41, page: query.page, pageSize: query.pageSize, statuses: { draft: 3, published: 30, editsNotLive: 8, archived: 2 } } }
    } })
    const response = await get(app, `${products}?status=draft,editsNotLive&q=knife&sort=edited&page=3&pageSize=20`)

    expect(response.status).toBe(200)
    expect(seen).toEqual([{ status: ['draft', 'editsNotLive'], q: 'knife', sort: 'edited', page: 3, pageSize: 20 }])
    expect(await response.json()).toEqual({ items: [], total: 41, page: 3, pageSize: 20, statuses: { draft: 3, published: 30, editsNotLive: 8, archived: 2 } })
  })

  it('with a page, defaults to ten rows, newest first, no status', async () => {
    const seen: ProductListQuery[] = []
    const app = setup({ listProducts: async (actor, store, query) => {
      seen.push(query)
      return createFakeCatalogUseCases().listProducts(actor, store, query)
    } })
    await get(app, `${products}?page=1`)

    expect(seen).toEqual([{ status: [], sort: 'created', page: 1, pageSize: 10 }])
  })

  it.each(['?pageSize=21', '?pageSize=0', '?page=0', '?page=1002', '?page=502&pageSize=20', '?status=gone', '?sort=price'])('%s is a 400', async (query) => {
    expect((await get(setup(), `${products}${query}`)).status).toBe(400)
  })

  it('a skip of exactly 10,000 rows is allowed', async () => {
    expect((await get(setup(), `${products}?page=1001`)).status).toBe(200)
  })

  it('a guest is 401', async () => {
    expect((await setup().request(products)).status).toBe(401)
  })
})

describe('[ADR-033 section 12] a request without page answers the whole list for one release', () => {
  it('products and inventory get page 1 of 500 and keep their filters', async () => {
    const products: unknown[] = []
    const stock: unknown[] = []
    const app = setup(
      {
        listProducts: async (actor, store, query) => {
          products.push(query)
          return createFakeCatalogUseCases().listProducts(actor, store, query)
        },
      },
      {
        listStock: async (actor, store, query) => {
          stock.push(query)
          return createFakeInventoryUseCases().listStock(actor, store, query)
        },
      },
    )
    await get(app, `${products_}?status=draft`)
    await get(app, `${inventory}?filter=sold-out`)

    expect(products).toEqual([{ status: ['draft'], sort: 'created', page: 1, pageSize: 500 }])
    expect(stock).toEqual([{ filter: 'sold-out', sort: 'name', page: 1, pageSize: 500 }])
  })
})

describe('[ADR-033] GET /products/lookup and /products/option-names', () => {
  it('lookup takes at most 50 ids and is not read as a keepsake id', async () => {
    const seen: string[][] = []
    const app = setup({ lookupProducts: async (_actor, _store, ids) => {
      seen.push(ids)
      return { ok: true, value: [] }
    } })
    const ids = Array.from({ length: 51 }, (_, i) => `0190f0c2-0000-7000-8000-${String(i).padStart(12, '0')}`)

    expect((await get(app, `${products}/lookup?ids=${productId}`)).status).toBe(200)
    expect(seen).toEqual([[productId]])
    expect((await get(app, `${products}/lookup?ids=${ids.join(',')}`)).status).toBe(400)
    expect((await get(app, `${products}/lookup?ids=nope`)).status).toBe(400)
  })

  it('option-names passes the keepsake to leave out and answers the names', async () => {
    const seen: (string | undefined)[] = []
    const app = setup({ listOptionNames: async (_actor, _store, except) => {
      seen.push(except)
      return { ok: true, value: [{ en: 'Size', de: 'Grösse' }] }
    } })
    const response = await get(app, `${products}/option-names?except=${productId}`)

    expect(await response.json()).toEqual({ items: [{ en: 'Size', de: 'Grösse' }] })
    expect(seen).toEqual([productId])
    expect((await get(app, `${products}/option-names?except=x`)).status).toBe(400)
  })
})

describe('[ADR-033] GET /inventory', () => {
  it('parses the tab, the search and the sort, and answers the page with the whole-store counts', async () => {
    const seen: unknown[] = []
    const app = setup({}, { listStock: async (_actor, _store, query) => {
      seen.push(query)
      return { ok: true, value: { items: [], total: 7, page: query.page, pageSize: query.pageSize, counts: { all: 30, inStock: 20, soldOut: 10 } } }
    } })
    const response = await get(app, `${inventory}?filter=sold-out&q=fondue&sort=newest&page=2&pageSize=5`)

    expect(seen).toEqual([{ filter: 'sold-out', q: 'fondue', sort: 'newest', page: 2, pageSize: 5 }])
    expect(await response.json()).toEqual({ items: [], total: 7, page: 2, pageSize: 5, counts: { all: 30, inStock: 20, soldOut: 10 } })
  })

  it('with a page, defaults to ten rows, by name', async () => {
    const seen: unknown[] = []
    const app = setup({}, { listStock: async (actor, store, query) => {
      seen.push(query)
      return createFakeInventoryUseCases().listStock(actor, store, query)
    } })
    await get(app, `${inventory}?page=1`)

    expect(seen).toEqual([{ sort: 'name', page: 1, pageSize: 10 }])
  })

  it.each(['?pageSize=21', '?page=0', '?page=1002', '?filter=low', '?sort=code'])('%s is a 400', async (query) => {
    expect((await get(setup(), `${inventory}${query}`)).status).toBe(400)
  })
})
