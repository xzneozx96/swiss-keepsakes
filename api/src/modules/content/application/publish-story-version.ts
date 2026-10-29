import type { ContentLanguage, StoryVersion } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { Result } from './failure.ts'
import type { StoryDeps } from './story-deps.ts'
import { storyMediaIds, storyVersionPublishGaps } from '@sk/domain/content'
import { mayManageContent, staffActor } from './access.ts'
import { ensureMediaReady } from './ensure-media-ready.ts'
import { fail, ok } from './failure.ts'

// One language goes live on its own; no rule asks for another. A draft-status version with no pending draft has
// nothing to publish but its kept published text, which is what goes live again. The text that goes live needs a
// title, a link, an excerpt and a cover, and an editorial review also its place and its check date. The database
// CHECK reads only the title and the link (ADR-015); the other rules live here. A publish never changes the link: it
// is the link both languages already share, and a version with none is refused (path slug) until a save sets it.
export function makePublishStoryVersion<T>({ uow, stories, media, audit, clock }: StoryDeps<T>) {
  return async (actor: Actor, storeId: string, groupId: string, language: ContentLanguage, ifMatch: number, requestId: string | null): Promise<Result<StoryVersion>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      // The group is locked before the version, the order a link save uses, so the two never wait on each other.
      const group = await stories.findGroupForUpdate(tx, storeId, groupId)
      const version = group && await stories.findVersionForUpdate(tx, storeId, groupId, language)
      if (!version)
        return fail({ reason: 'not-found' })
      if (version.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      const doc = version.draft ?? version.published
      const processing = doc && await ensureMediaReady(media, tx, storeId, storyMediaIds(doc).map(m => m.id))
      if (processing)
        return fail(processing)
      const gaps = storyVersionPublishGaps({
        slug: version.slug,
        title: doc?.title ?? '',
        excerpt: doc?.excerpt ?? '',
        coverMediaId: doc?.coverMediaId ?? null,
        checkedOn: doc?.checkedOn,
        kind: group.kind,
        subjectPlaceId: group.subjectPlaceId,
      })
      if (gaps.length > 0)
        return fail({ reason: 'incomplete', gaps })
      const published = await stories.publishVersion(tx, version, clock.now())
      await audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: 'story-version',
        entityId: groupId,
        action: 'published',
        before: { status: version.status },
        after: { status: 'published', language, rowVersion: published.rowVersion },
        requestId,
      })
      return ok(published)
    })
  }
}
