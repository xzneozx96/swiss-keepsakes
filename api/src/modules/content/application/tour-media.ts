import type { MediaRepository, TourChanges } from '../ports.ts'
import type { Failure } from './failure.ts'
import { checkMedia } from './check-media.ts'

// The cover and each stop photo must be images, the guide file a PDF. Each use is listed, not each file.
export function checkTourMedia<T>(media: MediaRepository<T>, tx: T, storeId: string, changes: TourChanges): Promise<Failure | undefined> {
  const wanted: { id: string, kind: 'image' | 'pdf' }[] = []
  if (changes.coverMediaId)
    wanted.push({ id: changes.coverMediaId, kind: 'image' })
  if (changes.pdfMediaId)
    wanted.push({ id: changes.pdfMediaId, kind: 'pdf' })
  for (const stop of changes.stops ?? []) {
    if (stop.mediaId)
      wanted.push({ id: stop.mediaId, kind: 'image' })
  }
  return checkMedia(media, tx, storeId, wanted)
}
