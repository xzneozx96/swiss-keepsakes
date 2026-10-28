import type { TourGuide } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { Result } from './failure.ts'
import type { TourDeps } from './tour-deps.ts'
import { mayManageContent, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'

export function makeUnpublishTour<T>({ uow, tours, audit, clock }: TourDeps<T>) {
  return async (actor: Actor, storeId: string, tourId: string, ifMatch: number, requestId: string | null): Promise<Result<TourGuide>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const tour = await tours.findForUpdate(tx, storeId, tourId)
      if (!tour)
        return fail({ reason: 'not-found' })
      if (tour.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      if (tour.status !== 'published')
        return fail({ reason: 'not-published' })
      const unpublished = await tours.unpublish(tx, tour, clock.now())
      await audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: 'tour',
        entityId: tour.id,
        action: 'unpublished',
        before: { status: tour.status },
        after: { status: 'draft', rowVersion: unpublished.rowVersion },
        requestId,
      })
      return ok(unpublished)
    })
  }
}
