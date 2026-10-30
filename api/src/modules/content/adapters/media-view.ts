import type { Media, MediaItem, MediaList, MediaUse, MediaUses } from '@sk/api-contract'
import type { MediaUses as MediaUsesResult } from '../application/get-media-uses.ts'
import type { MediaListPage, MediaListRow, MediaRecord } from '../ports.ts'
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

// A file of the library: the plain view plus the name, the description, the version and how many pages use it.
export function mediaItemView(row: MediaRecord & { usage?: MediaListRow['usage'] }, publicUrl: (key: string) => string): MediaItem {
  return {
    ...mediaView(row, publicUrl),
    name: row.name,
    fileName: row.fileName,
    alt: row.alt,
    durationSeconds: row.durationSeconds,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    ...(row.usage && { usage: row.usage }),
  }
}

export function mediaListView(page: MediaListPage, paging: { page: number, pageSize: number }, publicUrl: (key: string) => string): MediaList {
  return {
    items: page.rows.map(row => mediaItemView(row, publicUrl)),
    total: page.total,
    page: paging.page,
    pageSize: paging.pageSize,
    kinds: page.kinds,
    uses: page.uses,
    statuses: page.statuses,
  }
}

// A page picture is the smallest variant that exists, else the original.
function thumbnailUrl(file: { storageKey: string, width: number | null } | undefined, publicUrl: (key: string) => string): string | null {
  if (!file)
    return null
  return publicUrl(file.width === null ? file.storageKey : variantKey(file.storageKey, variantWidthsFor(file.width)[0]!))
}

export function mediaUsesView(uses: MediaUsesResult, publicUrl: (key: string) => string): MediaUses {
  const view = (row: MediaUsesResult['published'][number]): MediaUse => ({
    pageKind: row.pageKind,
    pageId: row.pageId,
    language: row.language,
    title: row.title,
    role: row.role,
    published: row.published,
    thumbnailUrl: row.thumbnailMediaId === null ? null : thumbnailUrl(uses.thumbnails.get(row.thumbnailMediaId), publicUrl),
  })
  return { published: uses.published.map(view), drafts: uses.drafts.map(view) }
}
