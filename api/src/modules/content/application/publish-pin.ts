import type { Pin } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { Result } from './failure.ts'
import type { PinDeps } from './pin-deps.ts'
import { pinPublishGaps } from '@sk/domain/content'
import { mayManageContent, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'

// The pending draft goes live. A hidden pin with no draft goes live with the text it had.
export function makePublishPin<T>({ uow, pins, audit, clock }: PinDeps<T>) {
  return async (actor: Actor, storeId: string, pinId: string, ifMatch: number, requestId: string | null): Promise<Result<Pin>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const pin = await pins.findForUpdate(tx, storeId, pinId)
      if (!pin)
        return fail({ reason: 'not-found' })
      if (pin.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      const gaps = pinPublishGaps({ ...pin, title: (pin.draft ?? pin.published)?.title ?? {} })
      if (gaps.length > 0)
        return fail({ reason: 'incomplete', gaps })
      const published = await pins.publish(tx, pin, clock.now())
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
