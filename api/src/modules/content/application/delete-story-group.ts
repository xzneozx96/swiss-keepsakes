import type { Actor } from '@sk/domain/identity'
import type { Result } from './failure.ts'
import type { StoryDeps } from './story-deps.ts'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'

export interface StoryGroupDeleted {
  pinsUnlinked: number
  storiesUnlinked: number
}

// Delete story (owner decision 2026-11-03, gates G-S8-E43-DELETE and G-S8-E43-STORYKEEP): the whole group, both language
// versions, published or not, in one transaction. A failure at any step leaves every row as it was.
// The order follows the keys: places.main_story_group_id and story_related.related_group_id are RESTRICT, so those links
// go first; story_versions_group_fkey is RESTRICT too, so the versions go before the group; the group's own related
// rows, places, keepsake links and categories are CASCADE. The use case that deletes ONE published version still refuses.
// The public reads have no cache of their own (read-stories.ts), so a deleted story is gone from the next read.
export function makeDeleteStoryGroup<T>({ uow, stories, clock }: StoryDeps<T>) {
  return async (actor: Actor, storeId: string, groupId: string, _requestId: string | null): Promise<Result<StoryGroupDeleted>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const group = await stories.findGroupForUpdate(tx, storeId, groupId)
      if (!group)
        return fail({ reason: 'not-found' })
      const pinsUnlinked = await stories.clearMainStory(tx, storeId, groupId, clock.now())
      const storiesUnlinked = await stories.removeRelatedTo(tx, storeId, groupId, clock.now())
      await stories.removeVersions(tx, storeId, groupId)
      // The row is locked above, so it is there. A false here is a bug: throw, so the transaction rolls back.
      if (!(await stories.removeGroup(tx, storeId, groupId)))
        throw new Error(`story group ${groupId} vanished while it was locked`)
      return ok({ pinsUnlinked, storiesUnlinked })
    })
  }
}
