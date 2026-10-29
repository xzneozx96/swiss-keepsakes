import type { StoryDraft } from '@sk/domain/content'
import type { MediaRepository } from '../ports.ts'
import type { Failure } from './failure.ts'
import { storyBodyMediaRefs } from '@sk/domain/content'
import { checkMedia } from './check-media.ts'

// The cover and the image nodes must be images, the audio nodes audio. Each use is listed, not each file: one
// file used as a cover and as an audio node fails as the wrong kind in one of them. The body is already shape-checked
// by the contract (depth and size included), so the walk is bounded.
export function checkStoryMedia<T>(media: MediaRepository<T>, tx: T, storeId: string, draft: StoryDraft | undefined): Promise<Failure | undefined> {
  const wanted: { id: string, kind: 'image' | 'audio' }[] = []
  if (draft?.coverMediaId)
    wanted.push({ id: draft.coverMediaId, kind: 'image' })
  if (draft)
    wanted.push(...storyBodyMediaRefs(draft.body))
  return checkMedia(media, tx, storeId, wanted)
}
