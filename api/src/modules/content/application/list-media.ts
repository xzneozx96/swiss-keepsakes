import type { Actor } from '@sk/domain/identity'
import type { KeepsakeUses, MediaLibrary, MediaListPage, MediaListQuery, UnitOfWork } from '../ports.ts'
import type { Result } from './failure.ts'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'

export interface MediaLibraryDeps<T> {
  uow: UnitOfWork<T>
  library: MediaLibrary<T>
  keepsakes: KeepsakeUses<T>
}

// One page of the library: the files of one kind, filtered, with how many pages use each and the counts for the
// tabs and filters. Keepsakes are asked of the catalog module in the same transaction (ADR-013).
export function makeListMedia<T>({ uow, library, keepsakes }: MediaLibraryDeps<T>) {
  return async (actor: Actor, storeId: string, query: MediaListQuery): Promise<Result<MediaListPage>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return ok(await uow.run(async tx => library.list(tx, storeId, query, await keepsakes.list(tx, storeId))))
  }
}
