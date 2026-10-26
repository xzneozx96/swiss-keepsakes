import type { LocalizedText } from '@sk/domain/catalog'

import { useProducts, useStoreSubcategories } from '@/features/catalog/api/queries'
import { useCommand } from '@/features/data-client'

/**
 * M26 data: the store's own sub-categories under Keepsakes (PRD §7.0), their order, and how
 * many keepsakes each holds. A sub-category with keepsakes cannot be deleted, so no product
 * is ever left without one.
 */
export function useSubcategories() {
  const { mutate: add } = useCommand('catalog', 'addSubcategory')
  const { mutate: rename } = useCommand('catalog', 'renameSubcategory')
  const { mutate: move } = useCommand('catalog', 'moveSubcategory')
  const { mutate: remove } = useCommand('catalog', 'removeSubcategory')
  const keepsakes = useStoreSubcategories(list =>
    list.filter(c => c.categoryId === 'keepsakes'),
  )
  const products = useProducts()

  return {
    keepsakes,
    countOf: (id: string) =>
      products.filter(p => p.subcategoryId === id).length,
    add: (name: LocalizedText) => add({ name }),
    rename: (id: string, name: LocalizedText) => rename({ id, name }),
    move: (id: string, direction: -1 | 1) => move({ id, direction }),
    remove: (id: string) => remove({ id }),
  }
}
