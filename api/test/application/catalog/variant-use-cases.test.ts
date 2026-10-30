import type { Actor } from '@sk/domain/identity'
import type { CatalogDeps } from '../../../src/modules/catalog/application/deps.ts'
import type { Product, ProductRepository, ProductVariant } from '../../../src/modules/catalog/ports.ts'
import { describe, expect, it, vi } from 'vitest'
import { makeCreateProduct } from '../../../src/modules/catalog/application/create-product.ts'
import { makeCreateVariant } from '../../../src/modules/catalog/application/create-variant.ts'
import { makeSaveOptions } from '../../../src/modules/catalog/application/save-options.ts'
import { makeSaveVariant } from '../../../src/modules/catalog/application/save-variant.ts'

const storeId = '0190f0c2-0000-7000-8000-00000000000a'
const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g-u1', stores: new Map([[storeId, 'owner']]) }
const guest: Actor = { kind: 'guest', userId: 'g1', guestId: 'g-g1' }

const variant = (id: string, skuCode: string, values: Record<string, string>, status: ProductVariant['status'] = 'published'): ProductVariant => ({ id, skuCode, priceRappen: 3900, status, values })

function product(over: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    storeId,
    status: 'draft',
    slug: null,
    draft: { name: { en: 'Knife' }, text: {}, media: [] },
    published: null,
    publishedMedia: [],
    commissionRate: 0,
    options: [{ id: 'size', name: { en: 'Size' }, values: [{ id: 's', label: { en: 'Small' }, swatch: null }, { id: 'l', label: { en: 'Large' }, swatch: null }] }],
    variants: [variant('1', 'VX-S', { size: 's' })],
    rowVersion: 4,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }
}

function setup(found: Product | undefined, reserved = new Map<string, number>()) {
  const repo = {
    findForUpdate: vi.fn(async () => found),
    saveVariant: vi.fn(async () => found),
    insertVariant: vi.fn(async () => found!),
    replaceOptions: vi.fn(async () => found!),
    insert: vi.fn(async () => found!),
  } as unknown as ProductRepository<null>
  const deps: CatalogDeps<null> = {
    uow: { run: work => work(null) },
    products: repo,
    media: { find: async () => [] },
    audit: { record: vi.fn(async () => {}) },
    clock: { now: () => new Date('2026-10-30T08:00:00Z') },
    reservations: { reservedBySku: async () => reserved },
  }
  return { repo, deps }
}

describe('[E6.2][AC52] saving the options', () => {
  const input = { options: [{ ref: 'size', name: { en: 'Size' }, values: [{ ref: 's', label: { en: 'Small' }, swatch: null }, { ref: 'l', label: { en: 'Large' }, swatch: null }, { ref: 'x', label: { en: 'XL' }, swatch: null }] }], variantValues: [] }

  it('[E6.2][AC52] writes once on the version that was opened', async () => {
    const { repo, deps } = setup(product())
    const result = await makeSaveOptions(deps)(owner, storeId, 'p1', 4, input, null)

    expect(result.ok).toBe(true)
    expect(repo.replaceOptions).toHaveBeenCalledTimes(1)
  })

  it('[E6.2][AC52] an old version is stale and nothing is written', async () => {
    const { repo, deps } = setup(product())

    expect(await makeSaveOptions(deps)(owner, storeId, 'p1', 3, input, null)).toMatchObject({ ok: false, reason: 'stale' })
    expect(repo.replaceOptions).not.toHaveBeenCalled()
  })

  it('[E6.2][AC52] a guest is forbidden, a missing keepsake is not found', async () => {
    expect(await makeSaveOptions(setup(product()).deps)(guest, storeId, 'p1', 4, input, null)).toMatchObject({ reason: 'forbidden' })
    expect(await makeSaveOptions(setup(undefined).deps)(owner, storeId, 'p1', 4, input, null)).toMatchObject({ reason: 'not-found' })
  })

  it('[E6.2][AC52] a refused save writes nothing and names the problem', async () => {
    const { repo, deps } = setup(product())
    const refused = { options: [{ ref: 'size', name: { en: 'Size' }, values: [{ ref: 'l', label: { en: 'Large' }, swatch: null }] }], variantValues: [] }
    const result = await makeSaveOptions(deps)(owner, storeId, 'p1', 4, refused, null)

    expect(result).toMatchObject({ ok: false, reason: 'refused', refusals: [{ code: 'value-in-use', params: { value: 'Small', count: 1, codes: 'VX-S' } }] })
    expect(repo.replaceOptions).not.toHaveBeenCalled()
  })
})

describe('[E6.2][AC52] creating a variant', () => {
  const base = { skuCode: 'VX-L', priceRappen: 3900, status: 'published' as const }

  it('[E6.2][AC52] a free combination is written', async () => {
    const { repo, deps } = setup(product())

    expect((await makeCreateVariant(deps)(owner, storeId, 'p1', { ...base, values: { size: 'l' } }, null)).ok).toBe(true)
    expect(repo.insertVariant).toHaveBeenCalledTimes(1)
  })

  it('[E6.2][AC52] a combination that is sold, archived or not, is refused', async () => {
    const { repo, deps } = setup(product({ variants: [variant('1', 'VX-S', { size: 's' }, 'archived')] }))
    const result = await makeCreateVariant(deps)(owner, storeId, 'p1', { ...base, values: { size: 's' } }, null)

    expect(result).toMatchObject({ reason: 'refused', refusals: [{ code: 'combination-taken', params: { code: 'VX-S', archived: 1 } }] })
    expect(repo.insertVariant).not.toHaveBeenCalled()
  })

  it('[E6.2][AC52] a bad code is refused before the database', async () => {
    const { deps } = setup(product())

    expect(await makeCreateVariant(deps)(owner, storeId, 'p1', { ...base, skuCode: 'VX L', values: { size: 'l' } }, null)).toMatchObject({ reason: 'sku-code-invalid' })
  })
})

describe('[E6.2][AC52] changing a variant', () => {
  it('[E6.2][AC52] archiving is refused while units are reserved, with the number', async () => {
    const { repo, deps } = setup(product(), new Map([['1', 2]]))
    const result = await makeSaveVariant(deps)(owner, storeId, 'p1', '1', { status: 'archived' }, null)

    expect(result).toMatchObject({ ok: false, reason: 'refused', refusals: [{ code: 'variant-reserved', params: { code: 'VX-S', count: 2 } }] })
    expect(repo.saveVariant).not.toHaveBeenCalled()
  })

  it('[E6.2][AC52] archiving with nothing reserved works', async () => {
    const { repo, deps } = setup(product(), new Map([['1', 0]]))

    expect((await makeSaveVariant(deps)(owner, storeId, 'p1', '1', { status: 'archived' }, null)).ok).toBe(true)
    expect(repo.saveVariant).toHaveBeenCalledTimes(1)
  })

  it('[E6.2][AC52] without a reservation port archiving never finds a reserved unit', async () => {
    const { repo, deps } = setup(product())

    expect((await makeSaveVariant({ ...deps, reservations: undefined })(owner, storeId, 'p1', '1', { status: 'archived' }, null)).ok).toBe(true)
    expect(repo.saveVariant).toHaveBeenCalledTimes(1)
  })

  it('[E6.2][AC52] an archived variant cannot be changed and has no restore', async () => {
    const { repo, deps } = setup(product({ variants: [variant('1', 'VX-S', { size: 's' }, 'archived')] }))

    for (const changes of [{ status: 'published' as const }, { status: 'draft' as const }, { priceRappen: 100 }]) {
      expect(await makeSaveVariant(deps)(owner, storeId, 'p1', '1', changes, null)).toMatchObject({ reason: 'refused', refusals: [{ code: 'variant-archived' }] })
    }
    expect(repo.saveVariant).not.toHaveBeenCalled()
  })

  it('[E6.2][AC52] a variant of another keepsake is not found', async () => {
    const { deps } = setup(product())

    expect(await makeSaveVariant(deps)(owner, storeId, 'p1', 'elsewhere', { priceRappen: 100 }, null)).toMatchObject({ reason: 'not-found' })
  })

  it('[E6.2][AC52] new values may not land on another variant, and may stay on its own', async () => {
    const two = product({ variants: [variant('1', 'VX-S', { size: 's' }), variant('2', 'VX-L', { size: 'l' })] })
    const { deps } = setup(two)

    expect(await makeSaveVariant(deps)(owner, storeId, 'p1', '2', { values: { size: 's' } }, null)).toMatchObject({ reason: 'refused', refusals: [{ code: 'combination-taken' }] })
    expect((await makeSaveVariant(deps)(owner, storeId, 'p1', '2', { values: { size: 'l' } }, null)).ok).toBe(true)
  })
})

describe('[E6.2][AC52] creating a keepsake with options', () => {
  const options = [{ ref: 'a', name: { en: 'Size' }, values: [{ ref: 'a1', label: { en: 'S' }, swatch: null }, { ref: 'a2', label: { en: 'L' }, swatch: null }] }]
  const create = (variants: { skuCode: string, values: Record<string, string> }[], opts = options) => makeCreateProduct(setup(product()).deps)(owner, storeId, {
    name: { en: 'Knife' },
    text: {},
    photoIds: [],
    commissionRate: 0,
    options: opts,
    variants: variants.map(v => ({ ...v, priceRappen: 3900, status: 'published' as const })),
  }, null)

  it('[E6.2][AC52] a variant for each ticked combination is created', async () => {
    expect((await create([{ skuCode: 'VX-S', values: { a: 'a1' } }, { skuCode: 'VX-L', values: { a: 'a2' } }])).ok).toBe(true)
  })

  it('[E6.2][AC52] one option or none still works', async () => {
    expect((await create([{ skuCode: 'VX-ONLY', values: {} }], [])).ok).toBe(true)
    expect((await create([{ skuCode: 'VX-S', values: { a: 'a1' } }])).ok).toBe(true)
  })

  it('[E6.2][AC52] a variant without the value of an option is refused', async () => {
    expect(await create([{ skuCode: 'VX-S', values: {} }])).toMatchObject({ reason: 'refused', refusals: [{ code: 'values-missing' }] })
  })
})
