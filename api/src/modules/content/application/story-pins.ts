import type { StoryDraft } from '@sk/domain/content'
import type { PinRepository } from '../ports.ts'
import type { Failure } from './failure.ts'
import { storyBodyPinIds } from '@sk/domain/content'

// A pinLink may name any pin of this store, draft or published. A pin of another store is the same as none.
export async function checkStoryPins<T>(pins: Pick<PinRepository<T>, 'idsInStore'>, tx: T, storeId: string, draft: StoryDraft | undefined): Promise<Failure | undefined> {
  if (!draft)
    return undefined
  const wanted = storyBodyPinIds(draft.body)
  if (wanted.length === 0)
    return undefined
  const found = new Set((await pins.idsInStore(tx, storeId, wanted)).map(id => id.toLowerCase()))
  return wanted.every(id => found.has(id.toLowerCase())) ? undefined : { reason: 'reference-invalid' }
}
