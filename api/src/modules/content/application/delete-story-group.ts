import type { Actor } from '@sk/domain/identity'
import type { Result } from './failure.ts'
import type { StoryDeps } from './story-deps.ts'
import { mayManageContent, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'

export interface StoryGroupDeleted {
  pinsUnlinked: number
  storiesUnlinked: number
}

// Delete story (owner decision 2026-11-03, gates G-S8-E43-DELETE and G-S8-E43-STORYKEEP): the whole group, both language
// versions, published or not, in one transaction. A failure at any step, the audit write included, leaves every row as it was.
// The repository does the delete in key order (see `deleteGroup`). The use case that deletes ONE published version still refuses.
// The public reads have no cache of their own (read-stories.ts), so a deleted story is gone from the next read.
export function makeDeleteStoryGroup<T>({ uow, stories, audit, clock }: StoryDeps<T>) {
  return async (actor: Actor, storeId: string, groupId: string, requestId: string | null): Promise<Result<StoryGroupDeleted>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const removed = await stories.deleteGroup(tx, storeId, groupId, clock.now())
      if (!removed)
        return fail({ reason: 'not-found' })
      const { pinsUnlinked, storiesUnlinked, versions } = removed
      await audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: 'story-group',
        entityId: groupId,
        action: 'deleted',
        before: { versions: [...versions].sort((a, b) => a.language.localeCompare(b.language)) },
        after: { pinsUnlinked, storiesUnlinked },
        requestId,
      })
      return ok({ pinsUnlinked, storiesUnlinked })
    })
  }
}
