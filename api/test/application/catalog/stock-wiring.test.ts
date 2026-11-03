import type { Actor } from '@sk/domain/identity'
import type { CatalogDeps } from '../../../src/modules/catalog/application/deps.ts'
import type { Product, ProductListRow, ProductRepository, ProductVariant, WrittenProduct } from '../../../src/modules/catalog/ports.ts'
import { describe, expect, it, vi } from 'vitest'
import { makeCreateProduct } from '../../../src/modules/catalog/application/create-product.ts'
import { makeCreateVariant } from '../../../src/modules/catalog/application/create-variant.ts'
import { makeGetProduct } from '../../../src/modules/catalog/application/get-product.ts'
import { makeListProducts } from '../../../src/modules/catalog/application/list-products.ts'
import { makeSaveOptions } from '../../../src/modules/catalog/application/save-options.ts'

const storeId = '0190f0c2-0000-7000-8000-00000000000a'
const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g-u1', stores: new Map([[storeId, 'owner']]) }

const variant = (id: string, values: Record<string, string>, status: ProductVariant['status'] = 'published'): ProductVariant => ({ id, skuCode: null, mediaId: null, priceRappen: 3900, status, values })

function product(variants: ProductVariant[]): Product {
  return {
    id: 'p1',
    storeId,
    status: 'draft',
    slug: null,
    draft: { name: { en: 'Knife' }, text: {}, media: [] },
    published: null,
    publishedMedia: [],
    commissionRate: 0,
    options: [{ id: 'size', name: { en: 'Size' }, values: [{ id: 's', label: { en: 'S' } }, { id: 'l', label: { en: 'L' } }, { id: 'x', label: { en: 'XL' } }] }],
    variants,
    rowVersion: 4,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// A transactional fake: `skus` and `stock` roll back together when the work throws, as the database does.
function setup(before: Product, after: Product, levels: Record<string, [onHand: number, reserved: number]> = {}) {
  const state = { skus: before.variants.map(v => v.id), stock: new Map<string, number>(Object.entries(levels).map(([id, [onHand]]) => [id, onHand])) }
  const seeds: { storeId: string, items: { skuId: string, quantity: number }[], actorUserId: string }[] = []
  const written = (): WrittenProduct => {
    const known = new Set(before.variants.map(v => v.id))

    state.skus = after.variants.map(v => v.id)
    return { product: after, createdSkuIds: after.variants.filter(v => !known.has(v.id)).map(v => v.id) }
  }
  const repo = {
    insert: vi.fn(async () => written()),
    insertVariant: vi.fn(async () => written()),
    replaceOptions: vi.fn(async () => written()),
    findForUpdate: vi.fn(async () => before),
    takenSkuCodes: vi.fn(async () => new Set<string>()),
    find: vi.fn(async () => after),
    list: vi.fn(async (): Promise<ProductListRow[]> => []),
  } as unknown as ProductRepository<null>
  const seed = vi.fn(async (_tx: null, store: string, items: { skuId: string, quantity: number }[], actorUserId: string) => {
    seeds.push({ storeId: store, items, actorUserId })
    for (const { skuId, quantity } of items) {
      if (state.stock.has(skuId))
        throw new Error('duplicate stock row')
      state.stock.set(skuId, quantity)
    }
  })
  const deps: CatalogDeps<null> = {
    uow: {
      run: async (work) => {
        const saved = { skus: [...state.skus], stock: new Map(state.stock) }
        try {
          return await work(null)
        }
        catch (error) {
          state.skus = saved.skus
          state.stock = saved.stock
          throw error
        }
      },
    },
    products: repo,
    media: { find: async () => [] },
    audit: { record: vi.fn(async () => {}) },
    clock: { now: () => new Date('2026-11-03T08:00:00Z') },
    keepsakeLinks: { removeAll: async () => {} },
    stock: { seed },
    stockLevels: {
      levels: async (_tx, _store, ids) => new Map(ids.flatMap((id) => {
        const onHand = state.stock.get(id)
        const reserved = levels[id]?.[1] ?? 0

        return onHand === undefined ? [] : [[id, { onHand, reserved }] as const]
      })),
    },
  }
  return { repo, deps, seed, seeds, state }
}

function newProduct(quantities: (number | undefined)[]) {
  return {
    name: { en: 'Knife' },
    text: {},
    photoIds: [],
    commissionRate: 0,
    options: [{ ref: 'size', name: { en: 'Size' }, values: [{ ref: 's', label: { en: 'S' } }, { ref: 'l', label: { en: 'L' } }] }],
    variants: quantities.map((quantity, index) => ({ skuCode: null, mediaId: null, priceRappen: 3900, status: 'published' as const, values: { size: index === 0 ? 's' : 'l' }, ...(quantity !== undefined && { quantity }) })),
  }
}

describe('[E6.3][AC05][AC53][AC-10] a new SKU gets its stock row in the same transaction', () => {
  it('[E6.3][AC05][AC53][AC-10] a new keepsake with no quantity: one row of 0', async () => {
    const created = product([variant('a', { size: 's' })])
    const { deps, seeds } = setup(product([]), created)

    expect((await makeCreateProduct(deps)(owner, storeId, newProduct([undefined]), null)).ok).toBe(true)
    expect(seeds).toEqual([{ storeId, items: [{ skuId: 'a', quantity: 0 }], actorUserId: 'u1' }])
  })

  it('[E6.3][AC05][AC53][AC-10] a new keepsake with a quantity of 12: a row of 12, and 0 for the other variant', async () => {
    const created = product([variant('a', { size: 's' }), variant('b', { size: 'l' })])
    const { deps, seeds } = setup(product([]), created)

    await makeCreateProduct(deps)(owner, storeId, newProduct([12, undefined]), null)
    expect(seeds[0]!.items).toEqual([{ skuId: 'a', quantity: 12 }, { skuId: 'b', quantity: 0 }])
  })

  it('[E6.3][AC05][AC53][CORRECTNESS-8] each quantity goes to the SKU the repository made for that variant, whatever order the product lists them in', async () => {
    // The product lists b before a; the repository says a was made for the first variant sent and b for the second.
    const listed = product([variant('b', { size: 'l' }), variant('a', { size: 's' })])
    const { deps, seeds, repo } = setup(listed, listed)

    vi.mocked(repo.insert).mockResolvedValue({ product: listed, createdSkuIds: ['a', 'b'] } as never)
    await makeCreateProduct(deps)(owner, storeId, newProduct([12, 3]), null)
    expect(seeds[0]!.items).toEqual([{ skuId: 'a', quantity: 12 }, { skuId: 'b', quantity: 3 }])
  })

  it('[E6.3][AC05][AC53][AC-10] a new variant on an existing keepsake: one row of 0, for the new SKU only', async () => {
    const existing = product([variant('a', { size: 's' })])
    const { deps, seeds } = setup(existing, product([variant('a', { size: 's' }), variant('b', { size: 'l' })]))

    await makeCreateVariant(deps)(owner, storeId, 'p1', { skuCode: null, mediaId: null, priceRappen: 3900, status: 'published', values: { size: 'l' } }, null)
    expect(seeds).toEqual([{ storeId, items: [{ skuId: 'b', quantity: 0 }], actorUserId: 'u1' }])
  })

  it('[E6.3][AC05][AC53][AC-10] a new variant with a quantity keeps it', async () => {
    const existing = product([variant('a', { size: 's' })])
    const { deps, seeds } = setup(existing, product([variant('a', { size: 's' }), variant('b', { size: 'l' })]))

    await makeCreateVariant(deps)(owner, storeId, 'p1', { skuCode: null, mediaId: null, priceRappen: 3900, status: 'published', values: { size: 'l' }, quantity: 7 }, null)
    expect(seeds[0]!.items).toEqual([{ skuId: 'b', quantity: 7 }])
  })

  it('[E6.3][AC05][AC53][AC-10] an options save seeds its new variants only, in the order sent', async () => {
    const existing = product([variant('a', { size: 's' })])
    const { deps, seeds } = setup(existing, product([variant('a', { size: 's' }), variant('b', { size: 'l' }), variant('c', { size: 'x' })]))
    const input = {
      options: [{ ref: 'size', name: { en: 'Size' }, values: [{ ref: 's', label: { en: 'S' } }, { ref: 'l', label: { en: 'L' } }, { ref: 'x', label: { en: 'XL' } }] }],
      variantValues: [],
      newVariants: [
        { skuCode: null, mediaId: null, priceRappen: 3900, status: 'published' as const, values: { size: 'l' }, quantity: 5 },
        { skuCode: null, mediaId: null, priceRappen: 3900, status: 'published' as const, values: { size: 'x' } },
      ],
    }

    expect((await makeSaveOptions(deps)(owner, storeId, 'p1', 4, input, null)).ok).toBe(true)
    expect(seeds).toEqual([{ storeId, items: [{ skuId: 'b', quantity: 5 }, { skuId: 'c', quantity: 0 }], actorUserId: 'u1' }])
  })

  it('[E6.3][AC05][AC53][AC-10] an options save with no new variant seeds nothing', async () => {
    const existing = product([variant('a', { size: 's' })])
    const { deps, seed } = setup(existing, existing)

    await makeSaveOptions(deps)(owner, storeId, 'p1', 4, { options: [{ ref: 'size', name: { en: 'Size' }, values: [{ ref: 's', label: { en: 'S' } }, { ref: 'l', label: { en: 'L' } }] }], variantValues: [], newVariants: [] }, null)
    expect(seed).not.toHaveBeenCalled()
  })

  it('[E6.3][AC05][AC53][AC-10] a seed that throws leaves neither the SKU nor its stock row', async () => {
    const created = product([variant('a', { size: 's' })])
    const { deps, state } = setup(product([]), created)

    deps.stock!.seed = async () => {
      throw new Error('boom')
    }
    await expect(makeCreateProduct(deps)(owner, storeId, newProduct([3]), null)).rejects.toThrow('boom')
    expect(state.skus).toEqual([])
    expect(state.stock.size).toBe(0)
  })

  it('[E6.3][AC05][AC53][AC-10] a duplicate stock row fails loudly and rolls the SKU back', async () => {
    const created = product([variant('a', { size: 's' })])
    const { deps, state } = setup(product([]), created, { a: [9, 0] })

    await expect(makeCreateProduct(deps)(owner, storeId, newProduct([undefined]), null)).rejects.toThrow('duplicate')
    expect(state.skus).toEqual([])
    expect([...state.stock]).toEqual([['a', 9]])
  })
})

describe('[E6.3][AC05][AC53] stock figures from inventory', () => {
  const abTwo = product([variant('a', { size: 's' }), variant('b', { size: 'l' }), variant('c', { size: 'x' }, 'archived')])

  it('[E6.3][AC05][AC53] the product reads on hand, reserved and available per variant, archived ones too; no row reads 0', async () => {
    const { deps } = setup(abTwo, abTwo, { a: [4, 1], c: [2, 0] })
    const result = await makeGetProduct(deps)(owner, storeId, 'p1')

    expect(result.ok && result.value.stock).toEqual(new Map([['a', { onHand: 4, reserved: 1 }], ['c', { onHand: 2, reserved: 0 }]]))
  })

  it('[E6.3][AC05][AC53][AC-4] A set to 0, B shows 4 available, the list counts 1 sold out', async () => {
    const { deps, repo } = setup(abTwo, abTwo, { a: [0, 0], b: [4, 0], c: [0, 0] })

    vi.mocked(repo.list).mockResolvedValue([{ id: 'p1', name: {}, optionNames: [], status: 'draft', hasUnpublishedEdits: false, coverMediaId: null, variantCount: 2, liveSkuIds: ['a', 'b'], rowVersion: 1, updatedAt: new Date() }])
    const detail = await makeGetProduct(deps)(owner, storeId, 'p1')
    const list = await makeListProducts(deps)(owner, storeId)

    expect(detail.ok && detail.value.stock.get('b')).toEqual({ onHand: 4, reserved: 0 })
    expect(detail.ok && detail.value.stock.get('a')).toEqual({ onHand: 0, reserved: 0 })
    expect(list.ok && list.value.map(entry => entry.soldOutCount)).toEqual([1])
  })

  it('[E6.3][AC05][AC53][AC-4] a variant with no row, or with everything reserved, counts as sold out; an archived one does not', async () => {
    const { deps, repo } = setup(abTwo, abTwo, { a: [3, 3] })

    vi.mocked(repo.list).mockResolvedValue([{ id: 'p1', name: {}, optionNames: [], status: 'draft', hasUnpublishedEdits: false, coverMediaId: null, variantCount: 2, liveSkuIds: ['a', 'b'], rowVersion: 1, updatedAt: new Date() }])
    const list = await makeListProducts(deps)(owner, storeId)

    expect(list.ok && list.value[0]!.soldOutCount).toBe(2)
  })

  it('[E6.3][AC05][AC53] a keepsake with no variant is not sold out, and no stock read is made for it', async () => {
    const { deps, repo } = setup(abTwo, abTwo)
    const levels = vi.fn(deps.stockLevels!.levels)

    deps.stockLevels = { levels }
    vi.mocked(repo.list).mockResolvedValue([{ id: 'p1', name: {}, optionNames: [], status: 'draft', hasUnpublishedEdits: false, coverMediaId: null, variantCount: 0, liveSkuIds: [], rowVersion: 1, updatedAt: new Date() }])
    const list = await makeListProducts(deps)(owner, storeId)

    expect(list.ok && list.value[0]!.soldOutCount).toBe(0)
    expect(levels).not.toHaveBeenCalled()
  })
})
