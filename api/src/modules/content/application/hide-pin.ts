import type { Pin } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { Result } from './failure.ts'
import type { PinDeps } from './pin-deps.ts'
import { mayManageContent, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'

export function makeHidePin<T>({ uow, pins, audit, clock }: PinDeps<T>) {
  return async (actor: Actor, storeId: string, pinId: string, ifMatch: number, requestId: string | null): Promise<Result<Pin>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const pin = await pins.findForUpdate(tx, storeId, pinId)
      if (!pin)
        return fail({ reason: 'not-found' })
      if (pin.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      if (pin.status !== 'published')
        return fail({ reason: 'not-published' })
      const hidden = await pins.hide(tx, pin, clock.now())
      await audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: 'pin',
        entityId: pin.id,
        action: 'hidden',
        before: { status: pin.status },
        after: { status: 'hidden', rowVersion: hidden.rowVersion },
        requestId,
      })
      return ok(hidden)
    })
  }
}
