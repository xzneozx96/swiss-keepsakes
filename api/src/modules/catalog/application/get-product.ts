import type { Actor } from '@sk/domain/identity'
import type { CatalogDeps } from './deps.ts'
import type { Result } from './failure.ts'
import type { ProductDetail } from './product-detail.ts'
import { mayEditCatalog } from './access.ts'
import { fail, ok } from './failure.ts'
import { describe } from './product-detail.ts'

export function makeGetProduct<T>({ uow, products, media }: CatalogDeps<T>) {
  return async (actor: Actor, storeId: string, productId: string): Promise<Result<ProductDetail>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const product = await products.find(tx, storeId, productId)
      return product ? ok(await describe(media, tx, product)) : fail({ reason: 'not-found' })
    })
  }
}
