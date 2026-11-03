import type { ContentLanguage, StoryGroup, StoryVersion } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { StoryRepository, UnitOfWork } from '../ports.ts'
import type { Result } from './failure.ts'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'

export interface StoryGroupRead {
  group: StoryGroup
  versions: Record<ContentLanguage, StoryVersion | null>
}

// One story group with its English and German versions, for the editor to load and autosave against.
export function makeGetStoryGroup<T>({ uow, stories }: { uow: UnitOfWork<T>, stories: Pick<StoryRepository<T>, 'findGroup' | 'findVersion'> }) {
  return async (actor: Actor, storeId: string, groupId: string): Promise<Result<StoryGroupRead>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const group = await stories.findGroup(tx, storeId, groupId)
      if (!group)
        return fail({ reason: 'not-found' })
      const [en, de] = await Promise.all([stories.findVersion(tx, storeId, groupId, 'en'), stories.findVersion(tx, storeId, groupId, 'de')])
      return ok({ group, versions: { en: en ?? null, de: de ?? null } })
    })
  }
}
