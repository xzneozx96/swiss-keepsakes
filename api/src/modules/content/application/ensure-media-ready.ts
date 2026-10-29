import type { MediaLookup } from '../ports.ts'
import type { Failure } from './failure.ts'

// Publishing puts files in front of visitors, so a file the worker has not finished is refused: the public URL
// would answer 404 until it is. A retired or missing id is not this check's concern (checkMedia ran at save time).
export async function ensureMediaReady<T>(media: MediaLookup<T>, tx: T, storeId: string, ids: string[]): Promise<Failure | undefined> {
  if (ids.length === 0)
    return undefined
  const rows = await media.find(tx, storeId, ids)
  const mediaIds = [...new Set(rows.filter(row => row.status === 'processing').map(row => row.id))]
  return mediaIds.length > 0 ? { reason: 'media-processing', mediaIds } : undefined
}
