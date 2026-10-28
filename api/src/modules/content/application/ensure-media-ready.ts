import type { MediaLookup } from '../ports.ts'
import type { Failure } from './failure.ts'

// Publishing puts files in front of visitors, so a file the worker has not finished is refused: the public URL
// would answer 404 until it is. A retired or missing id is not this check's concern (checkMedia ran at save time).
export async function ensureMediaReady<T>(media: MediaLookup<T>, tx: T, storeId: string, ids: string[]): Promise<Failure | undefined> {
  if (ids.length === 0)
    return undefined
  const rows = await media.find(tx, storeId, ids)
  return rows.some(row => row.status === 'processing') ? { reason: 'media-processing' } : undefined
}
