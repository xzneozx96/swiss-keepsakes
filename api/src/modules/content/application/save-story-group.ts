import type { StoryGroup } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { StoryGroupChanges } from '../ports.ts'
import type { Result } from './failure.ts'
import type { StoryDeps } from './story-deps.ts'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'

export function makeSaveStoryGroup<T>({ uow, stories, clock }: StoryDeps<T>) {
  return async (actor: Actor, storeId: string, groupId: string, ifMatch: number, changes: StoryGroupChanges, _requestId: string | null): Promise<Result<StoryGroup>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const group = await stories.findGroupForUpdate(tx, storeId, groupId)
      if (!group)
        return fail({ reason: 'not-found' })
      if (group.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      return ok(await stories.saveGroup(tx, group, changes, clock.now()))
    })
  }
}
