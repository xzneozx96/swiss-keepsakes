import type { StoryDraft } from '@sk/domain/content'
import type { MediaRepository } from '../ports.ts'
import type { Failure } from './failure.ts'
import { checkMedia } from './check-media.ts'

// The cover and the image blocks must be images, the audio blocks audio. Each use is listed, not each file: one
// file used as a cover and as an audio block fails as the wrong kind in one of them.
export function checkStoryMedia<T>(media: MediaRepository<T>, tx: T, storeId: string, draft: StoryDraft | undefined): Promise<Failure | undefined> {
  const wanted: { id: string, kind: 'image' | 'audio' }[] = []
  if (draft?.coverMediaId)
    wanted.push({ id: draft.coverMediaId, kind: 'image' })
  for (const section of draft?.sections ?? []) {
    for (const block of section.blocks) {
      if (block.type === 'image' || block.type === 'audio')
        wanted.push({ id: block.mediaId, kind: block.type })
    }
  }
  return checkMedia(media, tx, storeId, wanted)
}
