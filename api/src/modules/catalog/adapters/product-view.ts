import type { ProductListItem, Product as ProductView } from '@sk/api-contract'
import type { ProductListEntry } from '../application/list-products.ts'
import type { ProductDetail } from '../application/product-detail.ts'
import { hasUnpublishedEdits, workingDoc } from '../application/product-doc.ts'
import { publishChecks } from '../application/publish-checks.ts'

// The response shape of a keepsake: the dates as ISO strings, the working copy, and the publish checks computed from it.
export function productView({ product, photos }: ProductDetail): ProductView {
  const doc = workingDoc(product)
  const checks = publishChecks({ doc, variants: product.variants, options: product.options, commissionRate: product.commissionRate })
  return {
    id: product.id,
    storeId: product.storeId,
    status: product.status,
    name: doc.name,
    text: doc.text,
    photos,
    commissionRate: product.commissionRate,
    slug: product.slug,
    hasUnpublishedEdits: hasUnpublishedEdits(product),
    options: product.options,
    variants: product.variants.map(({ id, skuCode, priceRappen, status, values }) => ({ id, skuCode, priceRappen, status, values })),
    blocking: checks.blocking,
    warnings: checks.warnings,
    rowVersion: product.rowVersion,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  }
}

export function productListItemView({ row, cover }: ProductListEntry): ProductListItem {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    hasUnpublishedEdits: row.hasUnpublishedEdits,
    cover,
    variantCount: row.variantCount,
    soldOutCount: row.soldOutCount,
    updatedAt: row.updatedAt.toISOString(),
  }
}
