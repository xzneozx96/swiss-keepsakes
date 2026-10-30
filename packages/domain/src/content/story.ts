import type { StoryBody } from './body.ts'
import type { ContentLanguage, PublishGap, StayTag } from './localized.ts'
import { storyBodyMediaRefs } from './body.ts'

export type StoryVersionStatus = 'draft' | 'published'

export interface StoryDraft {
  title: string
  excerpt: string
  authorName: string
  coverMediaId: string | null
  /** Day the facts of an editorial review were checked (YYYY-MM-DD). Only an editorial review needs it to publish. */
  checkedOn?: string | null
  body: StoryBody
}

export interface StoryGroup {
  id: string
  storeId: string
  kind: 'story' | 'editorial_review'
  subjectPlaceId: string | null
  stayTag: StayTag
  interests: string[]
  categoryIds: string[]
  placeIds: string[]
  keepsakeProductIds: string[]
  relatedGroupIds: string[]
  rowVersion: number
  createdAt: Date
  updatedAt: Date
}

export interface StoryVersion {
  groupId: string
  storeId: string
  language: ContentLanguage
  status: StoryVersionStatus
  slug: string | null
  draft: StoryDraft | null
  published: StoryDraft | null
  publishedAt: Date | null
  rowVersion: number
  createdAt: Date
  updatedAt: Date
}

/** What story_versions_published_fields_check reads: a title and a slug. The save of a published version runs it. */
export function storyVersionCheckGaps(input: { title: string, slug: string | null }): PublishGap[] {
  const gaps: PublishGap[] = []
  if (input.title.trim() === '') gaps.push('title')
  if (input.slug === null || input.slug.trim() === '') gaps.push('slug')
  return gaps
}

export interface StoryPublishInput {
  title: string
  slug: string | null
  excerpt: string
  coverMediaId: string | null
  kind: StoryGroup['kind']
  subjectPlaceId: string | null
  checkedOn: string | null | undefined
}

/**
 * A version publishes with a title, a link, an excerpt and a cover; an editorial review also needs its place and
 * its check date. The gap names are the contract's field names. No rule asks for a second language (AC30).
 */
export function storyVersionPublishGaps(input: StoryPublishInput): PublishGap[] {
  const gaps = storyVersionCheckGaps(input)
  if (input.excerpt.trim() === '') gaps.push('excerpt')
  if (input.coverMediaId === null) gaps.push('coverMediaId')
  if (input.kind === 'editorial_review') {
    if (input.subjectPlaceId === null) gaps.push('subjectPlaceId')
    if (input.checkedOn == null || input.checkedOn.trim() === '') gaps.push('checkedOn')
  }
  return gaps
}

export function canMoveStoryVersion(version: Pick<StoryVersion, 'status' | 'published'>): boolean {
  return version.status !== 'published'
}

/** A version that kept published text (for example after unpublish) stays. */
export function canDeleteStoryVersion(version: Pick<StoryVersion, 'published'>): boolean {
  return version.published === null
}

/** Media the document points at, once each: the cover first, then every image or audio node in document order. */
export function storyMediaIds(doc: StoryDraft): { id: string, kind: 'image' | 'audio' }[] {
  const seen = new Map<string, 'image' | 'audio'>()
  if (doc.coverMediaId !== null) seen.set(doc.coverMediaId, 'image')
  for (const ref of storyBodyMediaRefs(doc.body)) {
    if (!seen.has(ref.id)) seen.set(ref.id, ref.kind)
  }
  return [...seen].map(([id, kind]) => ({ id, kind }))
}
