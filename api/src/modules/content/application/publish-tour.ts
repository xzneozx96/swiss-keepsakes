import type { TourGuide } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { Result } from './failure.ts'
import type { TourDeps } from './tour-deps.ts'
import { tourPublishGaps } from '@sk/domain/content'
import { mayManageContent, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'

// The pending draft goes live. An unpublished tour with no draft goes live with the text it had.
export function makePublishTour<T>({ uow, tours, audit, clock }: TourDeps<T>) {
  return async (actor: Actor, storeId: string, tourId: string, ifMatch: number, requestId: string | null): Promise<Result<TourGuide>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const tour = await tours.findForUpdate(tx, storeId, tourId)
      if (!tour)
        return fail({ reason: 'not-found' })
      if (tour.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      const gaps = tourPublishGaps({ slug: tour.slug, pdfMediaId: tour.pdfMediaId, title: (tour.draft ?? tour.published)?.title ?? {} })
      if (gaps.length > 0)
        return fail({ reason: 'incomplete', gaps })
      const published = await tours.publish(tx, tour, clock.now())
      await audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: 'tour',
        entityId: tour.id,
        action: 'published',
        before: { status: tour.status },
        after: { status: 'published', rowVersion: published.rowVersion },
        requestId,
      })
      return ok(published)
    })
  }
}
