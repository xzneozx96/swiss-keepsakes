import type { TourGuide } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { TourChanges } from '../ports.ts'
import type { Result } from './failure.ts'
import type { TourDeps } from './tour-deps.ts'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'
import { checkTourMedia } from './tour-media.ts'

// A new tour guide is a draft of the signed-in store. A stop place of another store is refused by the database
// (a foreign key that maps to reference-invalid).
export function makeCreateTour<T>({ uow, tours, media, clock }: TourDeps<T>) {
  return async (actor: Actor, storeId: string, changes: TourChanges, _requestId: string | null): Promise<Result<TourGuide>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const refused = await checkTourMedia(media, tx, storeId, changes)
      if (refused)
        return fail(refused)
      return ok(await tours.insert(tx, storeId, changes, clock.now()))
    })
  }
}
