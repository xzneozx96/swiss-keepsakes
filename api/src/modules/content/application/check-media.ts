import type { MediaLookup } from '../ports.ts'
import type { Failure } from './failure.ts'

// A retired file is reported before an unusable one, so the editor hears first about what it can fix by choosing
// another file. Processing files pass: no publish check looks at media status, so only a retired file is refused.
export async function checkMedia<T>(
  media: MediaLookup<T>,
  tx: T,
  storeId: string,
  wanted: { id: string, kind: 'image' | 'audio' | 'pdf' }[],
): Promise<Failure | undefined> {
  if (wanted.length === 0)
    return undefined
  const rows = new Map((await media.find(tx, storeId, wanted.map(w => w.id))).map(r => [r.id.toLowerCase(), r]))
  let invalid = false
  for (const { id, kind } of wanted) {
    const row = rows.get(id.toLowerCase())
    if (row?.status === 'retired')
      return { reason: 'media-retired' }
    if (!row || row.kind !== kind)
      invalid = true
  }
  return invalid ? { reason: 'media-invalid' } : undefined
}
