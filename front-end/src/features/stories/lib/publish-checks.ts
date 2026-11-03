import type { StoryGroupDetail } from '@sk/api-contract'
import type { PublishGap, StoryBody } from '@sk/domain/content'
import type { StoryFields } from './draft'
import type { StoryLanguage } from './search-params'

import { storyBodyFacts, storyBodyPinIds, storyVersionPublishGaps } from '@sk/domain/content'

export type CheckTarget = 'cover' | 'title' | 'excerpt' | 'body' | 'language' | 'link' | 'review' | 'categories' | 'pins' | 'keepsakes' | 'related'
export type CheckCode = 'cover' | 'title' | 'excerpt' | 'link' | 'review-place' | 'review-date' | 'no-text' | 'no-alt' | 'no-caption' | 'pin-unpublished' | 'no-category' | 'related-language' | 'keepsake-unpublished' | 'other-language'

export interface Check { code: CheckCode, step: 'write' | 'details' | 'publish', target: CheckTarget, count?: number, name?: string, language?: StoryLanguage }

/** What other lists say. A list that is still loading is left out, so its warnings are absent meanwhile. */
export interface PublishFacts {
  pins?: { id: string, name: string, status: string }[]
  /** `published` is about THIS language. */
  related?: { groupId: string, name: string, published: boolean }[]
  keepsakes?: { id: string, name: string, published: boolean }[]
}

export interface PublishChecks { blocking: Check[], warnings: Check[] }

export const GAP_CODE: Partial<Record<PublishGap, CheckCode>> = {
  coverMediaId: 'cover',
  title: 'title',
  excerpt: 'excerpt',
  slug: 'link',
  subjectPlaceId: 'review-place',
  checkedOn: 'review-date',
}

const BLOCKING: Record<string, Pick<Check, 'step' | 'target'>> = {
  'cover': { step: 'write', target: 'cover' },
  'title': { step: 'write', target: 'title' },
  'excerpt': { step: 'write', target: 'excerpt' },
  'link': { step: 'details', target: 'link' },
  'review-place': { step: 'details', target: 'review' },
  'review-date': { step: 'details', target: 'review' },
}

/**
 * What stops publishing this version and what only warns (owner decision, 29.10.2026). Blocking is the domain's own rule
 * (`storyVersionPublishGaps`, the same one the API applies) plus any gap a 422 named. The other language never blocks (AC30).
 */
export function publishChecks({ group, language, slug, fields, otherExists, facts, refused = [] }: {
  group: Pick<StoryGroupDetail, 'kind' | 'subjectPlaceId' | 'categoryIds' | 'relatedGroupIds' | 'keepsakeProductIds'>
  language: StoryLanguage
  /** The saved link of the open version. */
  slug: string | null
  /** What is typed now. */
  fields: StoryFields
  otherExists: boolean
  facts?: PublishFacts
  refused?: PublishGap[]
}): PublishChecks {
  const found = new Set<CheckCode>()

  for (const gap of [
    ...storyVersionPublishGaps({ title: fields.title, slug, excerpt: fields.excerpt, coverMediaId: fields.coverMediaId, kind: group.kind, subjectPlaceId: group.subjectPlaceId, checkedOn: fields.checkedOn }),
    ...refused,
  ]) {
    const code = GAP_CODE[gap]

    if (code)
      found.add(code)
  }

  const blocking = Object.keys(BLOCKING).filter(code => found.has(code as CheckCode)).map(code => ({ code: code as CheckCode, ...BLOCKING[code]! }))
  const warnings: Check[] = []
  const body = storyBodyFacts(fields.body as StoryBody)
  const other: StoryLanguage = language === 'en' ? 'de' : 'en'

  if (!body.hasContent)
    warnings.push({ code: 'no-text', step: 'write', target: 'body' })
  if (body.photosWithoutAlt > 0)
    warnings.push({ code: 'no-alt', step: 'write', target: 'body', count: body.photosWithoutAlt })
  if (body.mediaWithoutCaption > 0)
    warnings.push({ code: 'no-caption', step: 'write', target: 'body', count: body.mediaWithoutCaption })
  for (const id of storyBodyPinIds(fields.body as Parameters<typeof storyBodyPinIds>[0])) {
    const pin = facts?.pins?.find(item => item.id === id)

    if (pin && pin.status !== 'published')
      warnings.push({ code: 'pin-unpublished', step: 'write', target: 'body', name: pin.name })
  }
  if (group.categoryIds.length === 0)
    warnings.push({ code: 'no-category', step: 'details', target: 'categories' })
  for (const id of group.relatedGroupIds) {
    const related = facts?.related?.find(item => item.groupId === id)

    if (related && !related.published)
      warnings.push({ code: 'related-language', step: 'details', target: 'related', name: related.name, language })
  }
  for (const id of group.keepsakeProductIds) {
    const keepsake = facts?.keepsakes?.find(item => item.id === id)

    if (keepsake && !keepsake.published)
      warnings.push({ code: 'keepsake-unpublished', step: 'details', target: 'keepsakes', name: keepsake.name })
  }
  if (!otherExists)
    warnings.push({ code: 'other-language', step: 'publish', target: 'language', language: other })

  return { blocking, warnings }
}
