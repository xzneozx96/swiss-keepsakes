import type { ContentLanguage, StoryVersion } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { Result } from './failure.ts'
import type { StoryDeps } from './story-deps.ts'
import { mayManageContent, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'

export function makeUnpublishStoryVersion<T>({ uow, stories, audit, clock }: StoryDeps<T>) {
  return async (actor: Actor, storeId: string, groupId: string, language: ContentLanguage, ifMatch: number, requestId: string | null): Promise<Result<StoryVersion>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const version = await stories.findVersionForUpdate(tx, storeId, groupId, language)
      if (!version)
        return fail({ reason: 'not-found' })
      if (version.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      if (version.status !== 'published')
        return fail({ reason: 'not-published' })
      const unpublished = await stories.unpublishVersion(tx, version, clock.now())
      await audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: 'story-version',
        entityId: groupId,
        action: 'unpublished',
        before: { status: version.status },
        after: { status: 'draft', language, rowVersion: unpublished.rowVersion },
        requestId,
      })
      return ok(unpublished)
    })
  }
}
