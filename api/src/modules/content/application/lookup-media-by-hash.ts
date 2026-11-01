import type { Actor } from '@sk/domain/identity'
import type { MediaRecord, MediaRepository, UnitOfWork } from '../ports.ts'
import type { Result } from './failure.ts'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'

export interface LookupMediaByHashDeps<T> {
  uow: UnitOfWork<T>
  media: MediaRepository<T>
}

// Which of the files a merchant is about to upload are already in the store's library, by content. The browser sends
// the SHA-256 of every picked file in one call and gets the ready files that have those bytes. A name is no evidence
// (IMG_0001.jpg is a different photo on every phone), so nothing here looks at names. One query, however many hashes.
export function makeLookupMediaByHash<T>({ uow, media }: LookupMediaByHashDeps<T>) {
  return async (actor: Actor, storeId: string, hashes: string[]): Promise<Result<MediaRecord[]>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    const distinct = [...new Set(hashes)]
    if (distinct.length === 0)
      return ok([])
    return ok(await uow.run(tx => media.findReadyByHash(tx, storeId, distinct)))
  }
}
