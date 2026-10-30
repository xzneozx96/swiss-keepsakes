import type { Actor } from '@sk/domain/identity'
import type { MediaRepository, MediaUseRow } from '../ports.ts'
import type { Result } from './failure.ts'
import type { MediaLibraryDeps } from './list-media.ts'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'

export interface MediaUses {
  published: MediaUseRow[]
  drafts: MediaUseRow[]
  thumbnails: Map<string, { storageKey: string, width: number | null }>
}

// The pages that use one file, on published pages first and then only in drafts. A story is one page per language.
export function makeGetMediaUses<T>({ uow, library, keepsakes, media }: MediaLibraryDeps<T> & { media: Pick<MediaRepository<T>, 'findById'> }) {
  return async (actor: Actor, storeId: string, mediaId: string): Promise<Result<MediaUses>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      if (!await media.findById(tx, storeId, mediaId))
        return fail({ reason: 'not-found' })
      const rows = await library.usesOf(tx, storeId, mediaId, await keepsakes.list(tx, storeId))
      const ids = [...new Set(rows.flatMap(row => row.thumbnailMediaId ?? []))]
      return ok({
        published: rows.filter(row => row.published),
        drafts: rows.filter(row => !row.published),
        thumbnails: await library.thumbnails(tx, storeId, ids),
      })
    })
  }
}
