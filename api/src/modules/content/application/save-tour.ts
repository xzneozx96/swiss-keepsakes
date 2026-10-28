import type { TourGuide } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { TourChanges } from '../ports.ts'
import type { Result } from './failure.ts'
import type { TourDeps } from './tour-deps.ts'
import { tourPublishGaps } from '@sk/domain/content'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'
import { checkTourMedia } from './tour-media.ts'

// A save is a PATCH. On a published tour the database CHECK still reads the stored slug and PDF and the published
// title, so the use case runs the same rule on the merged result and names the gap.
export function makeSaveTour<T>({ uow, tours, media, clock }: TourDeps<T>) {
  return async (actor: Actor, storeId: string, tourId: string, ifMatch: number, changes: TourChanges, _requestId: string | null): Promise<Result<TourGuide>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const tour = await tours.findForUpdate(tx, storeId, tourId)
      if (!tour)
        return fail({ reason: 'not-found' })
      if (tour.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      const refused = await checkTourMedia(media, tx, storeId, changes)
      if (refused)
        return fail(refused)
      if (tour.status === 'published') {
        const gaps = tourPublishGaps({
          slug: changes.slug !== undefined ? changes.slug : tour.slug,
          pdfMediaId: changes.pdfMediaId !== undefined ? changes.pdfMediaId : tour.pdfMediaId,
          title: tour.published?.title ?? {},
        })
        if (gaps.length > 0)
          return fail({ reason: 'incomplete', gaps })
      }
      return ok(await tours.save(tx, tour, changes, clock.now()))
    })
  }
}
