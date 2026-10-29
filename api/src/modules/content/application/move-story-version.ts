import type { ContentLanguage, StoryVersion } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { Result } from './failure.ts'
import type { StoryDeps } from './story-deps.ts'
import { canMoveStoryVersion } from '@sk/domain/content'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'
import { otherLanguage } from './story-slug.ts'

// The database has no trigger that stops a published version changing group (ADR-005), so this is the only guard.
// A target group of another store has no row for this store, which reads as not-found. The moved version takes the
// link of the version of the other language in the target group, so the group keeps one link; a link another story
// holds in that language refuses the move.
export function makeMoveStoryVersion<T>({ uow, stories, clock }: StoryDeps<T>) {
  return async (actor: Actor, storeId: string, groupId: string, language: ContentLanguage, ifMatch: number, targetGroupId: string, _requestId: string | null): Promise<Result<StoryVersion>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      if (!(await stories.findGroupForUpdate(tx, storeId, targetGroupId)))
        return fail({ reason: 'not-found' })
      const version = await stories.findVersionForUpdate(tx, storeId, groupId, language)
      if (!version)
        return fail({ reason: 'not-found' })
      if (version.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      if (!canMoveStoryVersion(version))
        return fail({ reason: 'published-cannot-move' })
      if (await stories.findVersionForUpdate(tx, storeId, targetGroupId, language))
        return fail({ reason: 'version-exists' })
      const sibling = await stories.findVersionForUpdate(tx, storeId, targetGroupId, otherLanguage(language))
      const at = clock.now()
      const moved = await stories.moveVersion(tx, version, targetGroupId, at)
      return ok(sibling?.slug && sibling.slug !== moved.slug ? await stories.saveVersion(tx, moved, { slug: sibling.slug }, at) : moved)
    })
  }
}
