import type { MerchantCategory } from '@sk/api-contract'
import type { CategoryRow } from '../ports.ts'

// The response shape of a category: a missing language is null, and the store id stays inside.
export function categoryView(row: CategoryRow): MerchantCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: { en: row.name.en ?? null, de: row.name.de ?? null },
    parentId: row.parentId,
    position: row.position,
    childCount: row.childCount,
    useCount: row.useCount,
  }
}
