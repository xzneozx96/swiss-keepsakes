import type { Actor } from '@sk/domain/identity'
import type { Result } from './failure.ts'
import type { PinDeps } from './pin-deps.ts'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'

// A pin of any status that nothing uses (owner decision 2026-11-02, ADR-015 amendment). A story that links it, an editorial
// review about it or a tour stop on it refuses with how many; the database still refuses the same with `in-use` if one slips in.
export function makeDeletePin<T>({ uow, pins }: PinDeps<T>) {
  return async (actor: Actor, storeId: string, pinId: string, ifMatch: number, _requestId: string | null): Promise<Result<{ id: string }>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const pin = await pins.findForUpdate(tx, storeId, pinId)
      if (!pin)
        return fail({ reason: 'not-found' })
      if (pin.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      const { stories, reviews, tours } = await pins.usage(tx, storeId, pinId)
      if (stories + reviews + tours > 0)
        return fail({ reason: 'pin-in-use', stories, reviews, tours })
      if (!(await pins.remove(tx, storeId, pinId)))
        return fail({ reason: 'not-found' })
      return ok({ id: pinId })
    })
  }
}
