import type { ContentLanguage, StoryVersion } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { StoryVersionChanges } from '../ports.ts'
import type { Result } from './failure.ts'
import type { StoryDeps } from './story-deps.ts'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'
import { checkStoryMedia } from './story-media.ts'
import { checkStoryPins } from './story-pins.ts'
import { alignSibling, otherLanguage } from './story-slug.ts'

// A group has one version per language. The group row is locked so two creates of the same language queue up. The
// versions of a group share one link: a new version takes the link of the other language, and a link in the body is
// written to both, so a link another story holds in either language refuses the create and nothing is written.
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
      const sibling = await stories.findVersionForUpdate(tx, storeId, groupId, otherLanguage(language))
      const slug = changes.slug ?? sibling?.slug ?? null
      const version = await stories.insertVersion(tx, storeId, groupId, language, { ...changes, slug }, clock.now())
      if (!version)
        return fail({ reason: 'version-exists' })
      const refusedSibling = changes.slug ? await alignSibling(stories, tx, sibling, slug, clock.now()) : undefined
      return refusedSibling ? fail(refusedSibling) : ok(version)
    })
  }
}
