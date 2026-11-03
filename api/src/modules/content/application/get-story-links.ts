import type { Actor } from '@sk/domain/identity'
import type { StoryLinkCounts } from '../ports.ts'
import type { Result } from './failure.ts'
import type { StoryDeps } from './story-deps.ts'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'

// How many pins name the story as their main story and how many other stories list it as related: what Delete story
// would unlink. The confirm text says it before the delete.
export function makeGetStoryLinks<T>({ uow, stories }: StoryDeps<T>) {
  return async (actor: Actor, storeId: string, groupId: string): Promise<Result<StoryLinkCounts>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      if (!(await stories.findGroup(tx, storeId, groupId)))
        return fail({ reason: 'not-found' })
      return ok(await stories.linkCounts(tx, storeId, groupId))
    })
  }
}
