import type { Actor } from '@sk/domain/identity'
import type { CatalogDeps } from '../../../src/modules/catalog/application/deps.ts'
import type { Product, ProductRepository } from '../../../src/modules/catalog/ports.ts'
import { describe, expect, it, vi } from 'vitest'
import { makeCreateVariant } from '../../../src/modules/catalog/application/create-variant.ts'
import { makeDeleteProduct } from '../../../src/modules/catalog/application/delete-product.ts'
import { makeListProducts } from '../../../src/modules/catalog/application/list-products.ts'
import { makePublishProduct } from '../../../src/modules/catalog/application/publish-product.ts'
import { makeSaveOptions } from '../../../src/modules/catalog/application/save-options.ts'
import { makeSaveProduct } from '../../../src/modules/catalog/application/save-product.ts'
import { makeSaveVariant } from '../../../src/modules/catalog/application/save-variant.ts'
import { makeUnpublishProduct } from '../../../src/modules/catalog/application/unpublish-product.ts'

const storeId = '0190f0c2-0000-7000-8000-00000000000a'
const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g-u1', stores: new Map([[storeId, 'owner']]) }
const guest: Actor = { kind: 'guest', userId: 'g1', guestId: 'g-g1' }

function product(over: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    storeId,
    status: 'published',
    slug: { en: 'knife' },
    draft: null,
    published: { name: { en: 'Knife' }, text: {} },
    publishedMedia: ['m1'],
    commissionRate: 0,
    options: [],
    variants: [{ id: '1', skuCode: 'VX-1', mediaId: null, priceRappen: 3900, status: 'published', values: {} }],
    rowVersion: 4,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }
}

function setup(found: Product | undefined, sold: string[] = []) {
  const repo = {
    findForUpdate: vi.fn(async () => found),
    remove: vi.fn(async () => {}),
    archive: vi.fn(async (_tx: null, p: Product) => ({ ...p, status: 'archived' as const, rowVersion: p.rowVersion + 1 })),
    list: vi.fn(async () => [{ id: 'p1', name: {}, status: 'published' as const, hasUnpublishedEdits: false, coverMediaId: null, variantCount: 1, soldOutCount: 0, rowVersion: 4, updatedAt: new Date() }]),
    save: vi.fn(),
    publish: vi.fn(),
    unpublish: vi.fn(),
    saveVariant: vi.fn(),
    insertVariant: vi.fn(),
    replaceOptions: vi.fn(),
  } as unknown as ProductRepository<null>
  const audit = { record: vi.fn(async () => {}) }
  const keepsakeLinks = { removeAll: vi.fn(async () => {}) }
  const soldProductIds = vi.fn(async () => new Set(sold))
  const deps: CatalogDeps<null> = {
    uow: { run: work => work(null) },
    products: repo,
    media: { find: async () => [] },
    audit,
    clock: { now: () => new Date('2026-11-01T08:00:00Z') },
    sales: { soldProductIds, soldSkuIds: async () => new Set<string>() },
    keepsakeLinks,
  }
  return { repo, deps, audit, soldProductIds, keepsakeLinks }
}

describe('[E6.1] removing a keepsake', () => {
  it('[E6.1] deletes a keepsake no order references, and records it', async () => {
    const { repo, deps, audit } = setup(product())

    expect(await makeDeleteProduct(deps)(owner, storeId, 'p1', 4, 'r1')).toEqual({ ok: true, value: { id: 'p1', outcome: 'deleted' } })
    expect(repo.remove).toHaveBeenCalledTimes(1)
    expect(repo.archive).not.toHaveBeenCalled()
    expect(audit.record).toHaveBeenCalledWith(null, expect.objectContaining({ entity: 'product', entityId: 'p1', action: 'deleted', storeId }))
  })

  it('[E6.1] a delete also removes the story and tour links to the keepsake; an archive keeps them', async () => {
    const deleted = setup(product())
    const archived = setup(product(), ['p1'])

    await makeDeleteProduct(deleted.deps)(owner, storeId, 'p1', 4, null)
    await makeDeleteProduct(archived.deps)(owner, storeId, 'p1', 4, null)

    expect(deleted.keepsakeLinks.removeAll).toHaveBeenCalledWith(null, storeId, 'p1')
    expect(archived.keepsakeLinks.removeAll).not.toHaveBeenCalled()
  })

  it('[E6.1] archives a keepsake that has orders, and deletes nothing', async () => {
    const { repo, deps, audit } = setup(product(), ['p1'])

    expect(await makeDeleteProduct(deps)(owner, storeId, 'p1', 4, 'r1')).toEqual({ ok: true, value: { id: 'p1', outcome: 'archived' } })
    expect(repo.archive).toHaveBeenCalledTimes(1)
    expect(repo.remove).not.toHaveBeenCalled()
    expect(audit.record).toHaveBeenCalledWith(null, expect.objectContaining({ action: 'archived', before: { status: 'published' }, after: { status: 'archived', rowVersion: 5 } }))
  })

  it('[E6.1] with no sales directory wired nothing counts as sold', async () => {
    const { repo, deps } = setup(product())

    expect((await makeDeleteProduct({ ...deps, sales: undefined })(owner, storeId, 'p1', 4, null)).ok).toBe(true)
    expect(repo.remove).toHaveBeenCalledTimes(1)
  })

  it('[E6.1] a guest is forbidden, a missing keepsake is not found, an old version is stale; nothing is written', async () => {
    const { repo, deps } = setup(product())

    expect(await makeDeleteProduct(deps)(guest, storeId, 'p1', 4, null)).toMatchObject({ reason: 'forbidden' })
    expect(await makeDeleteProduct(setup(undefined).deps)(owner, storeId, 'p1', 4, null)).toMatchObject({ reason: 'not-found' })
    expect(await makeDeleteProduct(deps)(owner, storeId, 'p1', 3, null)).toMatchObject({ reason: 'stale' })
    expect(repo.remove).not.toHaveBeenCalled()
    expect(repo.archive).not.toHaveBeenCalled()
  })

  it('[E6.1] an archived keepsake is not removed again', async () => {
    const { repo, deps } = setup(product({ status: 'archived' }))

    expect(await makeDeleteProduct(deps)(owner, storeId, 'p1', 4, null)).toMatchObject({ ok: false, reason: 'archived' })
    expect(repo.remove).not.toHaveBeenCalled()
  })
})

describe('[E6.1] an archived keepsake is final', () => {
  const archived = () => setup(product({ status: 'archived' }))

  it.each([
    ['save', (d: CatalogDeps<null>) => makeSaveProduct(d)(owner, storeId, 'p1', 4, { name: { en: 'X' } }, null)],
    ['publish', (d: CatalogDeps<null>) => makePublishProduct(d)(owner, storeId, 'p1', 4, null)],
    ['unpublish', (d: CatalogDeps<null>) => makeUnpublishProduct(d)(owner, storeId, 'p1', 4, null)],
    ['options', (d: CatalogDeps<null>) => makeSaveOptions(d)(owner, storeId, 'p1', 4, { options: [], variantValues: [], newVariants: [] }, null)],
    ['saveVariant', (d: CatalogDeps<null>) => makeSaveVariant(d)(owner, storeId, 'p1', '1', { priceRappen: 100 }, null)],
    ['createVariant', (d: CatalogDeps<null>) => makeCreateVariant(d)(owner, storeId, 'p1', { skuCode: 'VX-2', mediaId: null, priceRappen: 100, status: 'published', values: {} }, null)],
  ])('[E6.1] %s is refused', async (_name, write) => {
    const { repo, deps } = archived()

    expect(await write(deps)).toMatchObject({ ok: false, reason: 'archived' })
    for (const method of ['save', 'publish', 'unpublish', 'saveVariant', 'insertVariant', 'replaceOptions'] as const)
      expect(repo[method]).not.toHaveBeenCalled()
  })
})

describe('[E6.1] the list says which keepsakes have orders', () => {
  it('[E6.1] marks a sold keepsake, and none when no sales directory is wired', async () => {
    const { deps } = setup(undefined, ['p1'])

    expect((await makeListProducts(deps)(owner, storeId) as { value: { hasOrders: boolean }[] }).value[0]!.hasOrders).toBe(true)
    expect((await makeListProducts({ ...deps, sales: undefined })(owner, storeId) as { value: { hasOrders: boolean }[] }).value[0]!.hasOrders).toBe(false)
  })
})
