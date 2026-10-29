import type { Localized } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { AuditLog, Clock, MediaRecord, MediaRepository, UnitOfWork } from '../ports.ts'
import type { Result } from './failure.ts'
import { mayManageContent, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'

export interface DescribeMediaDeps<T> {
  uow: UnitOfWork<T>
  media: MediaRepository<T>
  audit: AuditLog<T>
  clock: Clock
}

// Sets the name and the description (alt text) of a file. The contract has refused a blank name already; a retired
// file is read-only. Replacing a file never changes its name.
export function makeDescribeMedia<T>({ uow, media, audit, clock }: DescribeMediaDeps<T>) {
  return async (actor: Actor, storeId: string, mediaId: string, changes: { name?: string, alt?: Localized }, requestId: string | null): Promise<Result<MediaRecord>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const row = await media.findById(tx, storeId, mediaId, { forUpdate: true })
      if (!row)
        return fail({ reason: 'not-found' })
      if (row.status === 'retired')
        return fail({ reason: 'media-already-retired' })
      const saved = await media.describe(tx, row, changes, clock.now())
      if (!saved)
        return fail({ reason: 'not-found' })
      await audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: 'media',
        entityId: mediaId,
        action: 'described',
        before: { name: row.name, alt: row.alt },
        after: { name: saved.name, alt: saved.alt },
        requestId,
      })
      return ok(saved)
    })
  }
}
