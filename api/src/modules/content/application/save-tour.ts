import type { TourGuide } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { TourChanges } from '../ports.ts'
import type { Result } from './failure.ts'
import type { TourDeps } from './tour-deps.ts'
import { tourPublishGaps } from '@sk/domain/content'
import { mayManageContent } from './access.ts'
import { ensureMediaReady } from './ensure-media-ready.ts'
import { fail, ok } from './failure.ts'
import { mediaQueues } from './media-queues.ts'
import { checkTourMedia } from './tour-media.ts'

// A save is a PATCH. On a published tour the database CHECK still reads the stored slug and PDF and the published
// title, so the use case runs the same rule on the merged result and names the gap.
export function makeSaveTour<T>({ uow, tours, media, clock, jobs, graceHours }: TourDeps<T>) {
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
        // A live tour serves its files, so the ids the save leaves it with must be finished. A draft may hold a
        // file that is still processing. This runs before the write and the retire job, so a refusal changes nothing.
        const stops = changes.stops ?? tour.stops
        const files = [
          changes.coverMediaId !== undefined ? changes.coverMediaId : tour.coverMediaId,
          changes.pdfMediaId !== undefined ? changes.pdfMediaId : tour.pdfMediaId,
          ...stops.map(stop => stop.mediaId),
        ].filter(id => id !== null && id !== undefined)
        const processing = await ensureMediaReady(media, tx, storeId, files)
        if (processing)
          return fail(processing)
        const gaps = tourPublishGaps({
          slug: changes.slug !== undefined ? changes.slug : tour.slug,
          pdfMediaId: changes.pdfMediaId !== undefined ? changes.pdfMediaId : tour.pdfMediaId,
          title: tour.published?.title ?? {},
        })
        if (gaps.length > 0)
          return fail({ reason: 'incomplete', gaps })
      }
      const now = clock.now()
      const saved = await tours.save(tx, tour, changes, now)
      // Replacing a PDF retires the old file after the grace period. Clearing is not a replacement, and an
      // unchanged id still points at a file in use.
      if (tour.pdfMediaId && changes.pdfMediaId && changes.pdfMediaId.toLowerCase() !== tour.pdfMediaId.toLowerCase())
        await jobs.send(tx, mediaQueues.retire, { storeId, mediaId: tour.pdfMediaId }, { startAfter: new Date(now.getTime() + graceHours * 3_600_000) })
      return ok(saved)
    })
  }
}
