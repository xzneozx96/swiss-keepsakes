import type { StoryGroupDetail, StoryVersion } from '@sk/api-contract'
import type { PublishGap } from '@sk/domain/content'
import type { StoryFields } from './draft'

import { storyVersionPublishGaps } from '@sk/domain/content'

/** What stops this version publishing, by the domain's own rule (never re-derived here). */
export function blockingGaps(group: StoryGroupDetail, version: StoryVersion, fields: StoryFields): PublishGap[] {
  return storyVersionPublishGaps({
    title: fields.title,
    slug: version.slug,
    excerpt: fields.excerpt,
    coverMediaId: fields.coverMediaId,
    kind: group.kind,
    subjectPlaceId: group.subjectPlaceId,
    checkedOn: fields.checkedOn,
  })
}
