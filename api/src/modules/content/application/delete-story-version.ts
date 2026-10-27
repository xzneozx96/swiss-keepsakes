import type { ContentLanguage } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { Result } from './failure.ts'
import type { StoryDeps } from './story-deps.ts'
import { canDeleteStoryVersion } from '@sk/domain/content'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'

// Only a version that never held published text; one that was unpublished keeps it and stays.
export function makeDeleteStoryVersion<T>({ uow, stories }: StoryDeps<T>) {
  return async (actor: Actor, storeId: string, groupId: string, language: ContentLanguage, _requestId: string | null): Promise<Result<{ groupId: string, language: ContentLanguage }>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const version = await stories.findVersionForUpdate(tx, storeId, groupId, language)
      if (!version)
        return fail({ reason: 'not-found' })
      if (!canDeleteStoryVersion(version))
        return fail({ reason: 'published-cannot-be-deleted' })
      if (!(await stories.removeVersion(tx, storeId, groupId, language)))
        return fail({ reason: 'not-found' })
      return ok({ groupId, language })
    })
  }
}
