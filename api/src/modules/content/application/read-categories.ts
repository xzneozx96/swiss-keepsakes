import type { ReadDeps } from '../read-ports.ts'
import type { PublicCategoryList } from './public-view.ts'
import { toPublicCategory } from './public-view.ts'

export function makeListCategories<T>({ uow, reads }: ReadDeps<T>) {
  return async (kind: 'map' | 'blog'): Promise<PublicCategoryList> => {
    const rows = await uow.run(tx => reads.listCategories(tx, kind))
    return { items: rows.map(toPublicCategory) }
  }
}
