import type { Pin } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { PinChanges } from '../ports.ts'
import type { Result } from './failure.ts'
import type { PinDeps } from './pin-deps.ts'
import { pinPublishGaps } from '@sk/domain/content'
import { mayManageContent } from './access.ts'
import { checkMedia } from './check-media.ts'
import { fail, ok } from './failure.ts'

// A save is a PATCH. On a pin that was published, the database CHECK still reads the stored slug and location and
// the published title, so the use case runs the same rule on the merged result and names the gap.
export function makeSavePin<T>({ uow, pins, media, clock }: PinDeps<T>) {
  return async (actor: Actor, storeId: string, pinId: string, ifMatch: number, changes: PinChanges, _requestId: string | null): Promise<Result<Pin>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const pin = await pins.findForUpdate(tx, storeId, pinId)
      if (!pin)
        return fail({ reason: 'not-found' })
      if (pin.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      if (changes.coverMediaId) {
        const refused = await checkMedia(media, tx, storeId, [{ id: changes.coverMediaId, kind: 'image' }])
        if (refused)
          return fail(refused)
      }
      if (pin.status !== 'draft') {
        const gaps = pinPublishGaps({
          slug: changes.slug !== undefined ? changes.slug : pin.slug,
          latitude: changes.latitude !== undefined ? changes.latitude : pin.latitude,
          longitude: changes.longitude !== undefined ? changes.longitude : pin.longitude,
          title: pin.published?.title ?? {},
        })
        if (gaps.length > 0)
          return fail({ reason: 'incomplete', gaps })
      }
      return ok(await pins.save(tx, pin, changes, clock.now()))
    })
  }
}
