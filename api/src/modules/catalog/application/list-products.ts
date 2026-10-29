import type { Actor } from '@sk/domain/identity'
import type { MediaInfo, ProductListRow } from '../ports.ts'
import type { CatalogDeps } from './deps.ts'
import type { Result } from './failure.ts'
import { mayEditCatalog } from './access.ts'
import { fail, ok } from './failure.ts'

export interface ProductListEntry {
  row: ProductListRow
  cover: MediaInfo | null
}

// The keepsakes of the store, newest first, each with its first photo.
export function makeListProducts<T>({ uow, products, media }: CatalogDeps<T>) {
  return async (actor: Actor, storeId: string): Promise<Result<ProductListEntry[]>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const rows = await products.list(tx, storeId)
      const ids = rows.flatMap(row => row.coverMediaId ?? [])
      const found = new Map((ids.length > 0 ? await media.find(tx, storeId, ids) : []).map(file => [file.id.toLowerCase(), file]))
      return ok(rows.map(row => ({ row, cover: row.coverMediaId ? found.get(row.coverMediaId.toLowerCase()) ?? null : null })))
    })
  }
}
