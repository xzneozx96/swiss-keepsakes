import type { CatalogUseCases } from '../../src/modules/catalog/adapters/routes.ts'
import type { Product } from '../../src/modules/catalog/ports.ts'

export const fakeProduct: Product = {
  id: '0190f0c2-0000-7000-8000-0000000000c1',
  storeId: '0190f0c2-0000-7000-8000-00000000000a',
  status: 'draft',
  slug: null,
  draft: { name: { en: 'Victorinox' }, text: {}, media: [] },
  published: null,
  publishedMedia: [],
  commissionRate: 0,
  options: [],
  variants: [{ id: '0190f0c2-0000-7000-8000-0000000000c2', skuCode: 'VX-1', priceRappen: 3900, status: 'published', values: {} }],
  rowVersion: 1,
  createdAt: new Date('2026-10-30T08:00:00Z'),
  updatedAt: new Date('2026-10-30T08:00:00Z'),
}

// Stand-ins for the catalog use cases, for tests of the routes' guards over createApp. Each answers as if the row
// existed and the caller could do the thing, so a request that gets past the guard is not a 404 or a 403.
export function createFakeCatalogUseCases(): CatalogUseCases {
  const detail = (storeId: string, productId = fakeProduct.id, rowVersion = 1) => ({ product: { ...fakeProduct, storeId, id: productId, rowVersion }, photos: [] })
  return {
    listProducts: async () => ({ ok: true, value: [] }),
    getProduct: async (_actor, storeId, productId) => ({ ok: true, value: detail(storeId, productId) }),
    createProduct: async (_actor, storeId) => ({ ok: true, value: detail(storeId) }),
    saveProduct: async (_actor, storeId, productId, ifMatch) => ({ ok: true, value: detail(storeId, productId, ifMatch + 1) }),
    publishProduct: async (_actor, storeId, productId, ifMatch) => ({ ok: true, value: detail(storeId, productId, ifMatch + 1) }),
    unpublishProduct: async (_actor, storeId, productId, ifMatch) => ({ ok: true, value: detail(storeId, productId, ifMatch + 1) }),
    saveVariant: async (_actor, storeId, productId) => ({ ok: true, value: detail(storeId, productId) }),
    saveOptions: async (_actor, storeId, productId, ifMatch) => ({ ok: true, value: detail(storeId, productId, ifMatch + 1) }),
    createVariant: async (_actor, storeId, productId) => ({ ok: true, value: detail(storeId, productId) }),
  }
}
