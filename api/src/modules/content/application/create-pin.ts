import type { Pin } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { PinChanges } from '../ports.ts'
import type { Result } from './failure.ts'
import type { PinDeps } from './pin-deps.ts'
import { mayManageContent } from './access.ts'
import { checkMedia } from './check-media.ts'
import { fail, ok } from './failure.ts'

// A new pin is a draft of the signed-in store. Categories and the main story are checked by the database
// (a foreign key that names another store's row maps to reference-invalid).
export function makeCreatePin<T>({ uow, pins, media, clock }: PinDeps<T>) {
  return async (actor: Actor, storeId: string, changes: PinChanges, _requestId: string | null): Promise<Result<Pin>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      if (changes.coverMediaId) {
        const refused = await checkMedia(media, tx, storeId, [{ id: changes.coverMediaId, kind: 'image' }])
        if (refused)
          return fail(refused)
      }
      return ok(await pins.insert(tx, storeId, changes, clock.now()))
    })
  }
}
