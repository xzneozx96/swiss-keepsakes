import type { ContentLanguage, StoryVersion } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { StoryVersionChanges } from '../ports.ts'
import type { Result } from './failure.ts'
import type { StoryDeps } from './story-deps.ts'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'
import { checkStoryMedia } from './story-media.ts'
import { checkStoryPins } from './story-pins.ts'

// A group has one version per language. The group row is locked so two creates of the same language queue up.
export function makeCreateStoryVersion<T>({ uow, stories, media, pins, clock }: StoryDeps<T>) {
  return async (actor: Actor, storeId: string, groupId: string, language: ContentLanguage, changes: StoryVersionChanges, _requestId: string | null): Promise<Result<StoryVersion>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      if (!(await stories.findGroupForUpdate(tx, storeId, groupId)))
        return fail({ reason: 'not-found' })
      const refused = await checkStoryMedia(media, tx, storeId, changes.draft) ?? await checkStoryPins(pins, tx, storeId, changes.draft)
      if (refused)
        return fail(refused)
      const version = await stories.insertVersion(tx, storeId, groupId, language, changes, clock.now())
      return version ? ok(version) : fail({ reason: 'version-exists' })
    })
  }
}
