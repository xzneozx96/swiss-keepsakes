import type { ContentLanguage, StoryVersion } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { StoryVersionChanges } from '../ports.ts'
import type { Result } from './failure.ts'
import type { StoryDeps } from './story-deps.ts'
import { storyVersionCheckGaps } from '@sk/domain/content'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'
import { checkStoryMedia } from './story-media.ts'
import { checkStoryPins } from './story-pins.ts'
import { alignSibling, lockVersions } from './story-slug.ts'

// A save replaces the whole draft document. On a published version the database CHECK still reads the slug and the
// published title, so the use case runs the publish rule on the merged slug and the published title and names the gap.
// A save that carries a link writes it to the version of the other language too (the two share one link), also when
// the saved version already has it, which is how stories whose links differ are brought together. The other version's
// row_version goes up, so a stale editor of that language is refused. A link another story holds in either language
// makes the database refuse the statement and the whole save rolls back.
export function makeSaveStoryVersion<T>({ uow, stories, media, pins, clock }: StoryDeps<T>) {
  return async (actor: Actor, storeId: string, groupId: string, language: ContentLanguage, ifMatch: number, changes: StoryVersionChanges, _requestId: string | null): Promise<Result<StoryVersion>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const sharing = changes.slug !== undefined
      if (sharing && !(await stories.findGroupForUpdate(tx, storeId, groupId)))
        return fail({ reason: 'not-found' })
      const { version, sibling } = sharing
        ? await lockVersions(stories, tx, storeId, groupId, language)
        : { version: await stories.findVersionForUpdate(tx, storeId, groupId, language), sibling: undefined }
      if (!version)
        return fail({ reason: 'not-found' })
      if (version.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      const refused = await checkStoryMedia(media, tx, storeId, changes.draft) ?? await checkStoryPins(pins, tx, storeId, changes.draft)
      if (refused)
        return fail(refused)
      if (version.status === 'published') {
        const gaps = storyVersionCheckGaps({
          slug: changes.slug !== undefined ? changes.slug : version.slug,
          title: version.published?.title ?? '',
        })
        if (gaps.length > 0)
          return fail({ reason: 'incomplete', gaps })
      }
      const at = clock.now()
      if (changes.slug !== undefined) {
        const refusedSibling = await alignSibling(stories, tx, sibling, changes.slug, at)
        if (refusedSibling)
          return fail(refusedSibling)
      }
      return ok(await stories.saveVersion(tx, version, changes, at))
    })
  }
}
