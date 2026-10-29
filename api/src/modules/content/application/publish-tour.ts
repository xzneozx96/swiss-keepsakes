import type { Localized, TourGuide } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { Result } from './failure.ts'
import type { TourDeps } from './tour-deps.ts'
import { tourPublishGaps } from '@sk/domain/content'
import { mayManageContent, staffActor } from './access.ts'
import { ensureMediaReady } from './ensure-media-ready.ts'
import { fail, ok } from './failure.ts'
import { mergePublishSlug } from './publish-slug.ts'

// The pending draft goes live. An unpublished tour with no draft goes live with the text it had. A language the draft
// adds needs its slug in `slug`; a language the draft drops goes with its slug. The last language cannot be dropped.
export function makePublishTour<T>({ uow, tours, media, audit, clock }: TourDeps<T>) {
  return async (actor: Actor, storeId: string, tourId: string, ifMatch: number, requestId: string | null, slug?: Localized): Promise<Result<TourGuide>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const tour = await tours.findForUpdate(tx, storeId, tourId)
      if (!tour)
        return fail({ reason: 'not-found' })
      if (tour.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      const files = [tour.coverMediaId, tour.pdfMediaId, ...tour.stops.map(stop => stop.mediaId)].filter(id => id !== null)
      const processing = await ensureMediaReady(media, tx, storeId, files)
      if (processing)
        return fail(processing)
      const title = (tour.draft ?? tour.published)?.title ?? {}
      const merged = mergePublishSlug({ stored: tour.slug, body: slug, title, hasBeenPublished: tour.status !== 'draft' || tour.published !== null })
      if (!merged.ok)
        return fail({ reason: merged.reason })
      const liveSlug = merged.slug
      const gaps = tourPublishGaps({ slug: liveSlug, pdfMediaId: tour.pdfMediaId, title })
      if (gaps.length > 0)
        return fail({ reason: 'incomplete', gaps })
      const published = await tours.publish(tx, tour, clock.now(), liveSlug)
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
