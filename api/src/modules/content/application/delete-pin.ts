import type { Actor } from '@sk/domain/identity'
import type { Result } from './failure.ts'
import type { PinDeps } from './pin-deps.ts'
import { canDeletePin } from '@sk/domain/content'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'

// Only a pin that never was published. A story group or tour stop that names the pin makes the database refuse (in-use).
export function makeDeletePin<T>({ uow, pins }: PinDeps<T>) {
  return async (actor: Actor, storeId: string, pinId: string, _requestId: string | null): Promise<Result<{ id: string }>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const pin = await pins.findForUpdate(tx, storeId, pinId)
      if (!pin)
        return fail({ reason: 'not-found' })
      if (!canDeletePin(pin))
        return fail({ reason: 'published-cannot-be-deleted' })
      if (!(await pins.remove(tx, storeId, pinId)))
        return fail({ reason: 'not-found' })
      return ok({ id: pinId })
    })
  }
}
