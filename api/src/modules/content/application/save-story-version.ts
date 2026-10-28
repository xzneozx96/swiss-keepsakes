import type { ContentLanguage, StoryVersion } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { StoryVersionChanges } from '../ports.ts'
import type { Result } from './failure.ts'
import type { StoryDeps } from './story-deps.ts'
import { storyVersionPublishGaps } from '@sk/domain/content'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'
import { checkStoryMedia } from './story-media.ts'

// A save replaces the whole draft document. On a published version the database CHECK still reads the slug and the
// published title, so the use case runs the publish rule on the merged slug and the published title and names the gap.
export function makeSaveStoryVersion<T>({ uow, stories, media, clock }: StoryDeps<T>) {
  return async (actor: Actor, storeId: string, groupId: string, language: ContentLanguage, ifMatch: number, changes: StoryVersionChanges, _requestId: string | null): Promise<Result<StoryVersion>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const version = await stories.findVersionForUpdate(tx, storeId, groupId, language)
      if (!version)
        return fail({ reason: 'not-found' })
      if (version.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      const refused = await checkStoryMedia(media, tx, storeId, changes.draft)
      if (refused)
        return fail(refused)
      if (version.status === 'published') {
        const gaps = storyVersionPublishGaps({
          slug: changes.slug !== undefined ? changes.slug : version.slug,
          title: version.published?.title ?? '',
        })
        if (gaps.length > 0)
          return fail({ reason: 'incomplete', gaps })
      }
      return ok(await stories.saveVersion(tx, version, changes, clock.now()))
    })
  }
}
