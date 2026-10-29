import type { Media } from '@sk/api-contract'
import type { MediaRecord } from '../ports.ts'
import { variantKey, variantWidthsFor } from '@sk/domain/content'

// The response shape of a media row. The URLs exist only for a ready row, so `publicUrl` (which throws when the
// storage is not configured) is never called for the others.
export function mediaView(row: MediaRecord, publicUrl: (key: string) => string): Media {
  const ready = row.status === 'ready'
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    contentType: row.contentType,
    byteSize: row.byteSize,
    width: row.width,
    height: row.height,
    publicUrl: ready ? publicUrl(row.storageKey) : null,
    variants: ready && row.kind === 'image' && row.width !== null
      ? variantWidthsFor(row.width).map(width => ({ width, url: publicUrl(variantKey(row.storageKey, width)) }))
      : [],
  }
}
