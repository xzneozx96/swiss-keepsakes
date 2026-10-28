import type { ContentLanguage, PublishGap, StayTag } from './localized.ts'

export type StoryVersionStatus = 'draft' | 'published'

export type StoryBlock
  = | { type: 'paragraph', text: string }
    | { type: 'image', mediaId: string, caption: string }
    | { type: 'video', youtubeId: string, title: string, caption: string }
    | { type: 'audio', mediaId: string, title: string, caption: string }

export interface StorySection { id: string, heading: string, blocks: StoryBlock[] }

export interface StoryDraft {
  title: string
  excerpt: string
  intro: string
  authorName: string
  authorRole: string
  readMinutes: number | null
  coverMediaId: string | null
  sections: StorySection[]
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

/** A version publishes with a title and a slug. No rule asks for a second language (AC30). */
export function storyVersionPublishGaps(input: { title: string, slug: string | null }): PublishGap[] {
  const gaps: PublishGap[] = []
  if (input.title.trim() === '') gaps.push('title')
  if (input.slug === null || input.slug.trim() === '') gaps.push('slug')
  return gaps
}

export function canMoveStoryVersion(version: Pick<StoryVersion, 'status' | 'published'>): boolean {
  return version.status !== 'published'
}

/** A version that kept published text (for example after unpublish) stays. */
export function canDeleteStoryVersion(version: Pick<StoryVersion, 'published'>): boolean {
  return version.published === null
}

/** Media the document points at, once each: the cover and every image or audio block. */
export function storyMediaIds(doc: StoryDraft): { id: string, kind: 'image' | 'audio' }[] {
  const seen = new Map<string, 'image' | 'audio'>()
  if (doc.coverMediaId !== null) seen.set(doc.coverMediaId, 'image')
  for (const section of doc.sections) {
    for (const block of section.blocks) {
      if ((block.type === 'image' || block.type === 'audio') && !seen.has(block.mediaId)) {
        seen.set(block.mediaId, block.type)
      }
    }
  }
  return [...seen].map(([id, kind]) => ({ id, kind }))
}
