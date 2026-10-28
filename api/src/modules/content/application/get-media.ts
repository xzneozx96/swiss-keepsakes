import type { Actor } from '@sk/domain/identity'
import type { MediaRecord, MediaRepository, UnitOfWork } from '../ports.ts'
import type { Result } from './failure.ts'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'

// One row of this store's library. The row of another store is not-found, as if it did not exist.
export function makeGetMedia<T>({ uow, media }: { uow: UnitOfWork<T>, media: MediaRepository<T> }) {
  return async (actor: Actor, storeId: string, mediaId: string): Promise<Result<MediaRecord>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    const row = await uow.run(tx => media.findById(tx, storeId, mediaId))
    return row ? ok(row) : fail({ reason: 'not-found' })
  }
}
