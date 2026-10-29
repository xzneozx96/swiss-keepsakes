import type { Localized, Pin } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { Result } from './failure.ts'
import type { PinDeps } from './pin-deps.ts'
import { pinPublishGaps } from '@sk/domain/content'
import { mayManageContent, staffActor } from './access.ts'
import { ensureMediaReady } from './ensure-media-ready.ts'
import { fail, ok } from './failure.ts'
import { mergePublishSlug } from './publish-slug.ts'

// The pending draft goes live. A hidden pin with no draft goes live with the text it had. A language the draft adds
// needs its slug in `slug`; a language the draft drops goes with its slug. The last language cannot be dropped.
// The main photo and the extra photos must be done processing, as for a tour or a story.
export function makePublishPin<T>({ uow, pins, media, audit, clock }: PinDeps<T>) {
  return async (actor: Actor, storeId: string, pinId: string, ifMatch: number, requestId: string | null, slug?: Localized): Promise<Result<Pin>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const pin = await pins.findForUpdate(tx, storeId, pinId)
      if (!pin)
        return fail({ reason: 'not-found' })
      if (pin.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      const processing = await ensureMediaReady(media, tx, storeId, [...(pin.coverMediaId ? [pin.coverMediaId] : []), ...pin.photos.map(photo => photo.mediaId)])
      if (processing)
        return fail(processing)
      const title = (pin.draft ?? pin.published)?.title ?? {}
      const merged = mergePublishSlug({ stored: pin.slug, body: slug, title, hasBeenPublished: pin.status !== 'draft' || pin.published !== null })
      if (!merged.ok)
        return fail({ reason: merged.reason })
      const liveSlug = merged.slug
      const gaps = pinPublishGaps({ ...pin, slug: liveSlug, title })
      if (gaps.length > 0)
        return fail({ reason: 'incomplete', gaps })
      const published = await pins.publish(tx, pin, clock.now(), liveSlug)
      await audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: 'pin',
        entityId: pin.id,
        action: 'published',
        before: { status: pin.status },
        after: { status: 'published', rowVersion: published.rowVersion },
        requestId,
      })
      return ok(published)
    })
  }
}
