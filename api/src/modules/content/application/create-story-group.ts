import type { StoryGroup } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { StoryGroupChanges } from '../ports.ts'
import type { Result } from './failure.ts'
import type { StoryDeps } from './story-deps.ts'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'

export interface StoryGroupInput extends StoryGroupChanges {
  kind: StoryGroup['kind']
  subjectPlaceId: string | null
}

// kind and subject place are fixed here. The check up front is story_groups_subject_check; places, categories and
// related groups are checked by the database (a foreign key that names another store's row maps to reference-invalid).
export function makeCreateStoryGroup<T>({ uow, stories, clock }: StoryDeps<T>) {
  return async (actor: Actor, storeId: string, input: StoryGroupInput, _requestId: string | null): Promise<Result<StoryGroup>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    if ((input.kind === 'editorial_review') !== (input.subjectPlaceId !== null))
      return fail({ reason: 'reference-invalid' })
    return uow.run(async tx => ok(await stories.insertGroup(tx, storeId, input, clock.now())))
  }
}
