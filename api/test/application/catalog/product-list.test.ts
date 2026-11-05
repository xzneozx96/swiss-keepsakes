import type { Actor } from '@sk/domain/identity'
import type { CatalogDeps } from '../../../src/modules/catalog/application/deps.ts'
import type { MediaInfo, ProductListPage, ProductListQuery, ProductListRow, ProductRepository } from '../../../src/modules/catalog/ports.ts'
import { describe, expect, it, vi } from 'vitest'
import { makeListOptionNames, makeListProducts, makeLookupProducts } from '../../../src/modules/catalog/application/list-products.ts'

const storeId = '0190f0c2-0000-7000-8000-00000000000a'
const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g-u1', stores: new Map([[storeId, 'owner']]) }
const outsider: Actor = { kind: 'staff', userId: 'u2', guestId: 'g-u2', stores: new Map() }
const guest: Actor = { kind: 'guest', userId: 'g1', guestId: 'g-g1' }
const query: ProductListQuery = { status: [], sort: 'created', page: 1, pageSize: 10 }
const statuses = { draft: 1, published: 2, editsNotLive: 1, archived: 1 }

const row = (id: string, over: Partial<ProductListRow> = {}): ProductListRow => ({ id, name: { en: id }, optionNames: [], status: 'published', hasUnpublishedEdits: false, coverMediaId: null, variantCount: 1, liveSkuIds: [], rowVersion: 1, updatedAt: new Date('2026-11-05T08:00:00Z'), ...over })
const file = (id: string): MediaInfo => ({ id, kind: 'image', status: 'ready', name: 'f.jpg', contentType: 'image/jpeg', byteSize: 1, width: 1, height: 1, publicUrl: `https://cdn/${id}`, variants: [] })

function setup(rows: ProductListRow[] = [row('p1'), row('p2')]) {
  const products = {
    list: vi.fn(async (): Promise<ProductListPage> => ({ rows, total: 41, statuses })),
    byIds: vi.fn(async (_tx: null, _store: string, ids: string[]) => rows.filter(item => ids.includes(item.id))),
    optionNames: vi.fn(async () => [{ en: 'Size', de: 'Grösse' }]),
  } as unknown as ProductRepository<null>
  const media = { find: vi.fn(async (_tx: null, _store: string, ids: string[]) => ids.map(file)) }
  const deps = { uow: { run: <R>(work: (tx: null) => Promise<R>) => work(null) }, products, media } as unknown as CatalogDeps<null>

  return { deps, products, media }
}

describe('[ADR-033] the keepsake list pages on the server', () => {
  it('answers the page rows with the repository\'s total, the page, the page size and the status counts', async () => {
    const { deps, products } = setup()
    const result = await makeListProducts(deps)(owner, storeId, { ...query, page: 3, pageSize: 20, q: 'kn' })

    expect(result.ok && [result.value.entries.map(entry => entry.row.id), result.value.total, result.value.page, result.value.pageSize, result.value.statuses]).toEqual([['p1', 'p2'], 41, 3, 20, statuses])
    expect(products.list).toHaveBeenCalledWith(null, storeId, { ...query, page: 3, pageSize: 20, q: 'kn' })
  })

  it('reads the photos and the stock of the page rows once, not of the store', async () => {
    const { deps, media } = setup([row('p1', { coverMediaId: 'm1', liveSkuIds: ['a'] }), row('p2', { coverMediaId: 'm2', liveSkuIds: ['b'] })])
    const levels = vi.fn(async () => new Map([['a', { onHand: 0, reserved: 0 }], ['b', { onHand: 4, reserved: 1 }]]))
    const result = await makeListProducts({ ...deps, stockLevels: { levels } })(owner, storeId, query)

    expect(media.find).toHaveBeenCalledTimes(1)
    expect(vi.mocked(media.find).mock.calls[0]![2]).toEqual(['m1', 'm2'])
    expect(levels).toHaveBeenCalledTimes(1)
    expect(result.ok && result.value.entries.map(entry => [entry.cover?.id, entry.soldOutCount])).toEqual([['m1', 1], ['m2', 0]])
  })

  it.each([['guest', guest], ['outsider', outsider]])('refuses the %s', async (_name, actor) => {
    const { deps, products } = setup()

    expect(await makeListProducts(deps)(actor, storeId, query)).toEqual({ ok: false, reason: 'forbidden' })
    expect(products.list).not.toHaveBeenCalled()
  })
})

describe('[ADR-033] the keepsake lookup by id', () => {
  it('answers the named keepsakes whatever their status, with their photos', async () => {
    const { deps, products } = setup([row('p1', { status: 'archived', coverMediaId: 'm1' }), row('p2', { status: 'draft' })])
    const result = await makeLookupProducts(deps)(owner, storeId, ['p1', 'p2'])

    expect(products.byIds).toHaveBeenCalledWith(null, storeId, ['p1', 'p2'])
    expect(result.ok && result.value.map(entry => [entry.row.id, entry.cover?.id ?? null])).toEqual([['p1', 'm1'], ['p2', null]])
  })

  it('refuses a caller who may not edit the catalog', async () => {
    expect(await makeLookupProducts(setup().deps)(guest, storeId, ['p1'])).toEqual({ ok: false, reason: 'forbidden' })
  })
})

describe('[ADR-033] the option names', () => {
  it('asks for at most 50 names, leaving the edited keepsake out', async () => {
    const { deps, products } = setup()
    const result = await makeListOptionNames(deps)(owner, storeId, 'p9')

    expect(products.optionNames).toHaveBeenCalledWith(null, storeId, 50, 'p9')
    expect(result.ok && result.value).toEqual([{ en: 'Size', de: 'Grösse' }])
    expect(await makeListOptionNames(deps)(outsider, storeId)).toEqual({ ok: false, reason: 'forbidden' })
  })
})
