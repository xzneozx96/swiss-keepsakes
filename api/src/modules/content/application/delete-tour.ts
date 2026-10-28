import type { Actor } from '@sk/domain/identity'
import type { Result } from './failure.ts'
import type { TourDeps } from './tour-deps.ts'
import { canDeleteTour } from '@sk/domain/content'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'

// Only a tour that never was published; its stops and keepsake links go with it. The database has no guard for
// this (data-model Q-17), so this rule is the only one.
export function makeDeleteTour<T>({ uow, tours }: TourDeps<T>) {
  return async (actor: Actor, storeId: string, tourId: string, ifMatch: number, _requestId: string | null): Promise<Result<{ id: string }>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const tour = await tours.findForUpdate(tx, storeId, tourId)
      if (!tour)
        return fail({ reason: 'not-found' })
      if (tour.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      if (!canDeleteTour(tour))
        return fail({ reason: 'published-cannot-be-deleted' })
      if (!(await tours.remove(tx, storeId, tourId)))
        return fail({ reason: 'not-found' })
      return ok({ id: tourId })
    })
  }
}
