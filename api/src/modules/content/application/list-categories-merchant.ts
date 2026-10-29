import type { Actor } from '@sk/domain/identity'
import type { CategoryKind, CategoryRow } from '../ports.ts'
import type { CategoryDeps } from './category-deps.ts'
import type { Result } from './failure.ts'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'

export function makeListMerchantCategories<T>({ uow, categories }: CategoryDeps<T>) {
  return async (actor: Actor, storeId: string, kind: CategoryKind): Promise<Result<CategoryRow[]>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return ok(await uow.run(tx => categories.list(tx, storeId, kind)))
  }
}
