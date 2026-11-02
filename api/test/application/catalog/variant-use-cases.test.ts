import type { Actor } from '@sk/domain/identity'
import type { CatalogDeps } from '../../../src/modules/catalog/application/deps.ts'
import type { Product, ProductRepository, ProductVariant } from '../../../src/modules/catalog/ports.ts'
import { describe, expect, it, vi } from 'vitest'
import { makeCreateProduct } from '../../../src/modules/catalog/application/create-product.ts'
import { makeCreateVariant } from '../../../src/modules/catalog/application/create-variant.ts'
import { makeSaveOptions } from '../../../src/modules/catalog/application/save-options.ts'
import { makeSaveVariant } from '../../../src/modules/catalog/application/save-variant.ts'
import { makeSaveVariants } from '../../../src/modules/catalog/application/save-variants.ts'

const storeId = '0190f0c2-0000-7000-8000-00000000000a'
const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g-u1', stores: new Map([[storeId, 'owner']]) }
const guest: Actor = { kind: 'guest', userId: 'g1', guestId: 'g-g1' }

const variant = (id: string, skuCode: string | null, values: Record<string, string>, status: ProductVariant['status'] = 'published'): ProductVariant => ({ id, skuCode, mediaId: null, priceRappen: 3900, status, values })

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
    options: [{ id: 'size', name: { en: 'Size' }, values: [{ id: 's', label: { en: 'Small' } }, { id: 'l', label: { en: 'Large' } }] }],
    variants: [variant('1', 'VX-S', { size: 's' })],
    rowVersion: 4,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }
}

function setup(found: Product | undefined, reserved = new Map<string, number>(), taken = new Set<string>(), files: { id: string, kind: 'image' | 'audio' | 'pdf', status: 'processing' | 'ready' | 'retired' }[] = [], sold = new Set<string>()) {
  const repo = {
    findForUpdate: vi.fn(async () => found),
    saveVariant: vi.fn(async () => found),
    insertVariant: vi.fn(async () => found!),
    replaceOptions: vi.fn(async () => found!),
    saveVariants: vi.fn(async () => found!),
    removeVariants: vi.fn(async () => found!),
    takenSkuCodes: vi.fn(async (_tx: null, _store: string, codes: string[]) => new Set(codes.filter(code => taken.has(code)))),
    insert: vi.fn(async () => found!),
  } as unknown as ProductRepository<null>
  const deps: CatalogDeps<null> = {
    uow: { run: work => work(null) },
    products: repo,
    media: { find: async (_tx: null, _store: string, ids: string[]) => files.filter(file => ids.includes(file.id)).map(file => ({ ...file, name: 'f', contentType: 'image/png', byteSize: 1, width: 1, height: 1, publicUrl: null, variants: [] })) },
    audit: { record: vi.fn(async () => {}) },
    clock: { now: () => new Date('2026-10-30T08:00:00Z') },
    reservations: { reservedBySku: async () => reserved },
    keepsakeLinks: { removeAll: async () => {} },
    sales: { soldProductIds: async () => new Set<string>(), soldSkuIds: async (_tx: null, _store: string, ids: string[]) => new Set(ids.filter(id => sold.has(id))) },
  }
  return { repo, deps }
}

describe('[E6.2][AC52] saving the options', () => {
  const input = { options: [{ ref: 'size', name: { en: 'Size' }, values: [{ ref: 's', label: { en: 'Small' } }, { ref: 'l', label: { en: 'Large' } }, { ref: 'x', label: { en: 'XL' } }] }], variantValues: [], newVariants: [] }

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
    const refused = { options: [{ ref: 'size', name: { en: 'Size' }, values: [{ ref: 'l', label: { en: 'Large' } }] }], variantValues: [], newVariants: [] }
    const result = await makeSaveOptions(deps)(owner, storeId, 'p1', 4, refused, null)

    expect(result).toMatchObject({ ok: false, reason: 'refused', refusals: [{ code: 'value-in-use', params: { value: 'Small', count: 1, codes: 'VX-S' } }] })
    expect(repo.replaceOptions).not.toHaveBeenCalled()
  })
})

describe('[E6.2][AC52] creating a variant', () => {
  const base = { skuCode: 'VX-L', mediaId: null, priceRappen: 3900, status: 'published' as const }

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

    expect(await makeCreateVariant(deps)(owner, storeId, 'p1', { ...base, skuCode: 'VX L', mediaId: null, values: { size: 'l' } }, null)).toMatchObject({ reason: 'sku-code-invalid' })
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
  const options = [{ ref: 'a', name: { en: 'Size' }, values: [{ ref: 'a1', label: { en: 'S' } }, { ref: 'a2', label: { en: 'L' } }] }]
  const create = (variants: { skuCode: string | null, mediaId?: null, values: Record<string, string> }[], opts = options) => makeCreateProduct(setup(product()).deps)(owner, storeId, {
    name: { en: 'Knife' },
    text: {},
    photoIds: [],
    commissionRate: 0,
    options: opts,
    variants: variants.map(v => ({ mediaId: null, ...v, priceRappen: 3900, status: 'published' as const })),
  }, null)

  it('[E6.2][AC52] a variant for each ticked combination is created', async () => {
    expect((await create([{ skuCode: 'VX-S', mediaId: null, values: { a: 'a1' } }, { skuCode: 'VX-L', mediaId: null, values: { a: 'a2' } }])).ok).toBe(true)
  })

  it('[E6.2][AC52] one option or none still works', async () => {
    expect((await create([{ skuCode: 'VX-ONLY', mediaId: null, values: {} }], [])).ok).toBe(true)
    expect((await create([{ skuCode: 'VX-S', mediaId: null, values: { a: 'a1' } }])).ok).toBe(true)
  })

  it('[E6.2][AC52] a variant without the value of an option is refused', async () => {
    expect(await create([{ skuCode: 'VX-S', mediaId: null, values: {} }])).toMatchObject({ reason: 'refused', refusals: [{ code: 'values-missing' }] })
  })
})

describe('[T-008][AC1] saving the options with new variants', () => {
  const options = [{ ref: 'size', name: { en: 'Size' }, values: [{ ref: 's', label: { en: 'Small' } }, { ref: 'l', label: { en: 'Large' } }] }]
  const save = (deps: CatalogDeps<null>, newVariants: { skuCode: string | null, mediaId?: null, values: Record<string, string> }[]) =>
    makeSaveOptions(deps)(owner, storeId, 'p1', 4, { options, variantValues: [], newVariants: newVariants.map(v => ({ mediaId: null, ...v, priceRappen: 3900, status: 'published' as const })) }, null)

  it('[T-008][AC1] writes the options and the new variants once', async () => {
    const { repo, deps } = setup(product())

    expect((await save(deps, [{ skuCode: 'VX-L', mediaId: null, values: { size: 'l' } }])).ok).toBe(true)
    expect(repo.replaceOptions).toHaveBeenCalledTimes(1)
    expect(repo.replaceOptions).toHaveBeenCalledWith(null, expect.anything(), expect.objectContaining({ newVariants: [expect.objectContaining({ skuCode: 'VX-L', status: 'published' })] }), expect.any(Date))
  })

  it('[T-008][AC2] a code of the shop is refused with the row named, and nothing is written', async () => {
    const { repo, deps } = setup(product(), new Map(), new Set(['VX-L']))

    expect(await save(deps, [{ skuCode: 'VX-L', mediaId: null, values: { size: 'l' } }])).toMatchObject({ ok: false, reason: 'refused', refusals: [{ code: 'code-taken', path: 'newVariants.0.skuCode', params: { code: 'VX-L' } }] })
    expect(repo.replaceOptions).not.toHaveBeenCalled()
  })

  it('[T-008][AC2] a taken combination and a bad code are refused before the database', async () => {
    const { repo, deps } = setup(product())

    expect(await save(deps, [{ skuCode: 'VX-S2', mediaId: null, values: { size: 's' } }])).toMatchObject({ reason: 'refused', refusals: [{ code: 'combination-taken', path: 'newVariants.0.values' }] })
    expect(await save(deps, [{ skuCode: 'VX L', mediaId: null, values: { size: 'l' } }])).toMatchObject({ reason: 'sku-code-invalid', path: 'newVariants.0.skuCode' })
    expect(repo.replaceOptions).not.toHaveBeenCalled()
  })
})

describe('[T-019][AC3] removing a variant: deleted if never sold, else archived', () => {
  const two = () => product({ variants: [variant('1', 'VX-S', { size: 's' }), variant('2', 'VX-L', { size: 'l' }), variant('3', 'VX-X', { size: 'x' }, 'archived')] })
  const sold = (...ids: string[]) => new Set(ids)

  it('[T-019][AC3] a variant that no order line names is deleted, with an audit row, and nothing is archived', async () => {
    const { repo, deps } = setup(two())

    expect((await makeSaveVariant(deps)(owner, storeId, 'p1', '1', { status: 'removed' }, 'req-1')).ok).toBe(true)
    expect(repo.removeVariants).toHaveBeenCalledWith(null, expect.anything(), ['1'])
    expect(repo.saveVariant).not.toHaveBeenCalled()
    expect(deps.audit.record).toHaveBeenCalledWith(null, expect.objectContaining({ entity: 'sku', entityId: '1', action: 'deleted' }))
  })

  it('[T-019][AC3] a variant that an order line names is archived, not deleted', async () => {
    const { repo, deps } = setup(two(), new Map(), new Set(), [], sold('1'))

    expect((await makeSaveVariant(deps)(owner, storeId, 'p1', '1', { status: 'removed' }, null)).ok).toBe(true)
    expect(repo.removeVariants).not.toHaveBeenCalled()
    expect(repo.saveVariant).toHaveBeenCalledWith(null, expect.anything(), '1', { status: 'archived' }, expect.any(Date))
    expect(deps.audit.record).toHaveBeenCalledWith(null, expect.objectContaining({ entityId: '1', action: 'archived' }))
  })

  it('[T-019][AC3] without a sales directory nothing counts as sold', async () => {
    const { repo, deps } = setup(two())

    expect((await makeSaveVariant({ ...deps, sales: undefined })(owner, storeId, 'p1', '1', { status: 'removed' }, null)).ok).toBe(true)
    expect(repo.removeVariants).toHaveBeenCalledTimes(1)
  })

  it('[T-019][AC3] reserved units still refuse, and an archived variant is not deleted', async () => {
    const { repo, deps } = setup(two(), new Map([['1', 2]]))

    expect(await makeSaveVariant(deps)(owner, storeId, 'p1', '1', { status: 'removed' }, null)).toMatchObject({ reason: 'refused', refusals: [{ code: 'variant-reserved', params: { code: 'VX-S', count: 2 } }] })
    expect(await makeSaveVariant(deps)(owner, storeId, 'p1', '3', { status: 'removed' }, null)).toMatchObject({ reason: 'refused', refusals: [{ code: 'variant-archived' }] })
    expect(repo.removeVariants).not.toHaveBeenCalled()
  })

  it('[T-019][AC4] several variants: the unsold are deleted and the sold archived, in one request', async () => {
    const { repo, deps } = setup(two(), new Map(), new Set(), [], sold('2'))

    expect((await makeSaveVariants(deps)(owner, storeId, 'p1', [{ id: '1', status: 'removed' }, { id: '2', status: 'removed' }], null)).ok).toBe(true)
    expect(repo.removeVariants).toHaveBeenCalledWith(null, expect.anything(), ['1'])
    expect(repo.saveVariants).toHaveBeenCalledWith(null, expect.anything(), [{ id: '2', status: 'archived' }], expect.any(Date))
    expect(deps.audit.record).toHaveBeenCalledWith(null, expect.objectContaining({ entityId: '1', action: 'deleted' }))
    expect(deps.audit.record).toHaveBeenCalledWith(null, expect.objectContaining({ entityId: '2', action: 'archived' }))
  })

  it('[T-019][AC4] one reserved or archived row refuses the whole request and nothing is written', async () => {
    const { repo, deps } = setup(two(), new Map([['2', 1]]))

    expect(await makeSaveVariants(deps)(owner, storeId, 'p1', [{ id: '1', status: 'removed' }, { id: '2', status: 'removed' }], null)).toMatchObject({ reason: 'refused', refusals: [{ code: 'variant-reserved', path: 'variants.1.status' }] })
    expect(await makeSaveVariants(deps)(owner, storeId, 'p1', [{ id: '1', status: 'removed' }, { id: '3', status: 'removed' }], null)).toMatchObject({ reason: 'refused', refusals: [{ code: 'variant-archived', path: 'variants.1.status' }] })
    expect(repo.removeVariants).not.toHaveBeenCalled()
    expect(repo.saveVariants).not.toHaveBeenCalled()
  })

  it('[T-019][AC4] only removals: saveVariants is not called with an empty list', async () => {
    const { repo, deps } = setup(two())

    expect((await makeSaveVariants(deps)(owner, storeId, 'p1', [{ id: '1', status: 'removed' }, { id: '2', status: 'removed' }], null)).ok).toBe(true)
    expect(repo.removeVariants).toHaveBeenCalledWith(null, expect.anything(), ['1', '2'])
    expect(repo.saveVariants).not.toHaveBeenCalled()
  })
})

describe('[T-008][AC3] changing several variants', () => {
  const two = () => product({ variants: [variant('1', 'VX-S', { size: 's' }), variant('2', 'VX-L', { size: 'l' }), variant('3', 'VX-X', { size: 'x' }, 'archived')] })

  it('[T-008][AC3] writes the price and status of all rows in one call', async () => {
    const { repo, deps } = setup(two())
    const changes = [{ id: '1', priceRappen: 4100 }, { id: '2', status: 'draft' as const }]

    expect((await makeSaveVariants(deps)(owner, storeId, 'p1', changes, null)).ok).toBe(true)
    expect(repo.saveVariants).toHaveBeenCalledTimes(1)
    expect(repo.saveVariants).toHaveBeenCalledWith(null, expect.anything(), changes, expect.any(Date))
  })

  it('[T-008][AC3] an archived row refuses the whole request', async () => {
    const { repo, deps } = setup(two())

    expect(await makeSaveVariants(deps)(owner, storeId, 'p1', [{ id: '1', priceRappen: 4100 }, { id: '3', priceRappen: 100 }], null)).toMatchObject({ ok: false, reason: 'refused', refusals: [{ code: 'variant-archived', path: 'variants.1.status', params: { code: 'VX-X' } }] })
    expect(repo.saveVariants).not.toHaveBeenCalled()
  })

  it('[T-008][AC3] a variant of another keepsake is not found, and nothing is written', async () => {
    const { repo, deps } = setup(two())

    expect(await makeSaveVariants(deps)(owner, storeId, 'p1', [{ id: '1', priceRappen: 4100 }, { id: 'elsewhere', priceRappen: 100 }], null)).toMatchObject({ ok: false, reason: 'not-found' })
    expect(repo.saveVariants).not.toHaveBeenCalled()
  })

  it('[T-008][AC3] archiving is refused while units are reserved, with the number', async () => {
    const { repo, deps } = setup(two(), new Map([['2', 3]]))

    expect(await makeSaveVariants(deps)(owner, storeId, 'p1', [{ id: '1', status: 'archived' }, { id: '2', status: 'archived' }], null)).toMatchObject({ reason: 'refused', refusals: [{ code: 'variant-reserved', path: 'variants.1.status', params: { code: 'VX-L', count: 3 } }] })
    expect(repo.saveVariants).not.toHaveBeenCalled()
  })

  it('[T-008][AC3] a guest is forbidden, an archived keepsake is a conflict', async () => {
    expect(await makeSaveVariants(setup(two()).deps)(guest, storeId, 'p1', [{ id: '1' }], null)).toMatchObject({ reason: 'forbidden' })
    expect(await makeSaveVariants(setup(product({ status: 'archived' })).deps)(owner, storeId, 'p1', [{ id: '1' }], null)).toMatchObject({ reason: 'archived' })
    expect(await makeSaveVariants(setup(undefined).deps)(owner, storeId, 'p1', [{ id: '1' }], null)).toMatchObject({ reason: 'not-found' })
  })
})

const photo = '0190f0c2-0000-7000-8000-0000000000f1'

describe('[T-010] variants with no SKU code', () => {
  const none = { skuCode: null, mediaId: null, priceRappen: 3900, status: 'published' as const }

  it('[T-010] a variant with no code is created without the code check', async () => {
    const { repo, deps } = setup(product())

    expect((await makeCreateVariant(deps)(owner, storeId, 'p1', { ...none, values: { size: 'l' } }, null)).ok).toBe(true)
    expect(repo.insertVariant).toHaveBeenCalledWith(null, expect.anything(), expect.objectContaining({ skuCode: null }), expect.any(Date))
  })

  it('[T-010] a refusal names a variant with no code by its values', async () => {
    const { deps } = setup(product({ variants: [variant('1', null, { size: 's' })] }))

    expect(await makeCreateVariant(deps)(owner, storeId, 'p1', { ...none, values: { size: 's' } }, null)).toMatchObject({ reason: 'refused', refusals: [{ code: 'combination-taken', params: { code: 'Small', archived: 0 } }] })
  })

  it('[T-010] null clears the code of one variant, and a left-out code stays', async () => {
    const { repo, deps } = setup(product())

    expect((await makeSaveVariant(deps)(owner, storeId, 'p1', '1', { skuCode: null }, null)).ok).toBe(true)
    expect(repo.saveVariant).toHaveBeenCalledWith(null, expect.anything(), '1', { skuCode: null }, expect.any(Date))
  })

  it('[T-010] two new variants with no code are not duplicates, and two equal codes are', async () => {
    const opts = [{ ref: 'a', name: { en: 'Size' }, values: [{ ref: 'a1', label: { en: 'S' } }, { ref: 'a2', label: { en: 'L' } }] }]
    const create = (codes: (string | null)[]) => makeCreateProduct(setup(product()).deps)(owner, storeId, {
      name: { en: 'Knife' },
      text: {},
      photoIds: [],
      commissionRate: 0,
      options: opts,
      variants: codes.map((skuCode, index) => ({ skuCode, mediaId: null, priceRappen: 3900, status: 'published' as const, values: { a: index === 0 ? 'a1' : 'a2' } })),
    }, null)

    expect((await create([null, null])).ok).toBe(true)
    expect(await create(['VX-1', 'vx-1'])).toMatchObject({ reason: 'refused', refusals: [{ code: 'code-duplicate', path: 'variants.1.skuCode' }] })
  })

  it('[T-010] the bulk save clears every code in one write, and checks a code it sets', async () => {
    const two = product({ variants: [variant('1', 'VX-S', { size: 's' }), variant('2', 'VX-L', { size: 'l' })] })
    const cleared = setup(two)

    expect((await makeSaveVariants(cleared.deps)(owner, storeId, 'p1', [{ id: '1', skuCode: null }, { id: '2', skuCode: null }], null)).ok).toBe(true)
    expect(cleared.repo.saveVariants).toHaveBeenCalledTimes(1)
    expect(await makeSaveVariants(setup(two, new Map(), new Set(['VX-X'])).deps)(owner, storeId, 'p1', [{ id: '1', skuCode: 'VX-X' }], null)).toMatchObject({ reason: 'refused', refusals: [{ code: 'code-taken', path: 'variants.0.skuCode' }] })
    expect(await makeSaveVariants(setup(two).deps)(owner, storeId, 'p1', [{ id: '1', skuCode: 'A-1' }, { id: '2', skuCode: 'a-1' }], null)).toMatchObject({ reason: 'refused', refusals: [{ code: 'code-duplicate', path: 'variants.1.skuCode' }] })
  })
})

describe('[T-010] the photo of a variant', () => {
  const base = { skuCode: null, priceRappen: 3900, status: 'published' as const, values: { size: 'l' } }

  it('[T-010] a ready image of the library is written', async () => {
    const { repo, deps } = setup(product(), new Map(), new Set(), [{ id: photo, kind: 'image', status: 'ready' }])

    expect((await makeCreateVariant(deps)(owner, storeId, 'p1', { ...base, mediaId: photo }, null)).ok).toBe(true)
    expect(repo.insertVariant).toHaveBeenCalledTimes(1)
  })

  it('[T-010] a file that is not in the library, not an image or retired is refused and nothing is written', async () => {
    const cases = [
      { files: [], reason: 'media-invalid' },
      { files: [{ id: photo, kind: 'pdf' as const, status: 'ready' as const }], reason: 'media-invalid' },
      { files: [{ id: photo, kind: 'image' as const, status: 'retired' as const }], reason: 'media-retired' },
    ]

    for (const { files, reason } of cases) {
      const { repo, deps } = setup(product(), new Map(), new Set(), files)

      expect(await makeCreateVariant(deps)(owner, storeId, 'p1', { ...base, mediaId: photo }, null)).toMatchObject({ ok: false, reason })
      expect(await makeSaveVariant(deps)(owner, storeId, 'p1', '1', { mediaId: photo }, null)).toMatchObject({ ok: false, reason })
      expect(await makeSaveVariants(deps)(owner, storeId, 'p1', [{ id: '1', mediaId: photo }], null)).toMatchObject({ ok: false, reason })
      expect(repo.insertVariant).not.toHaveBeenCalled()
      expect(repo.saveVariant).not.toHaveBeenCalled()
      expect(repo.saveVariants).not.toHaveBeenCalled()
    }
  })

  it('[T-010] a file the worker is still processing is accepted, as for a keepsake photo', async () => {
    const { repo, deps } = setup(product(), new Map(), new Set(), [{ id: photo, kind: 'image', status: 'processing' }])

    expect((await makeCreateVariant(deps)(owner, storeId, 'p1', { ...base, mediaId: photo }, null)).ok).toBe(true)
    expect((await makeSaveVariant(deps)(owner, storeId, 'p1', '1', { mediaId: photo }, null)).ok).toBe(true)
    expect(repo.insertVariant).toHaveBeenCalledTimes(1)
    expect(repo.saveVariant).toHaveBeenCalledTimes(1)
  })

  it('[T-010] null removes the photo without a lookup', async () => {
    const { repo, deps } = setup(product())

    expect((await makeSaveVariant(deps)(owner, storeId, 'p1', '1', { mediaId: null }, null)).ok).toBe(true)
    expect(repo.saveVariant).toHaveBeenCalledTimes(1)
  })
})
