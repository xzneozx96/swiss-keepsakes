import type { ContentLanguage } from '@sk/domain/content'
import type { ReadDeps } from '../read-ports.ts'
import type { Result } from './failure.ts'
import type { PublicPin } from './public-view.ts'
import { fail, ok } from './failure.ts'
import { toPublicPin } from './public-view.ts'

// The pin card. The database view decides which pins are public; a pin that is hidden, a draft or unknown is a 404,
// and so is one whose dates have all ended by the injected clock.
export function makeGetPin<T>({ uow, reads, clock }: ReadDeps<T>) {
  return async (id: string, language: ContentLanguage): Promise<Result<PublicPin>> => {
    const row = await uow.run(tx => reads.findVisiblePin(tx, id))
    const pin = row && toPublicPin(row, language, clock.now())
    return pin ? ok(pin) : fail({ reason: 'not-found' })
  }
}
