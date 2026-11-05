import type { StoryGroupDetail as StoryGroupDetailView, StoryGroup as StoryGroupView, StoryList as StoryListView, StoryVersionText as StoryVersionTextView, StoryVersion as StoryVersionView } from '@sk/api-contract'
import type { StoryDraft, StoryGroup, StoryVersion } from '@sk/domain/content'
import type { StoryGroupRead } from '../application/get-story-group.ts'
import type { StoryVersionText } from '../application/get-story-version-text.ts'
import type { StoryListEntry, StoryListResult } from '../application/list-story-groups.ts'
import { mediaView } from './media-view.ts'

// The response shape of a story group: the dates as ISO strings.
export function storyGroupView(group: StoryGroup): StoryGroupView {
  return {
    id: group.id,
    storeId: group.storeId,
    kind: group.kind,
    subjectPlaceId: group.subjectPlaceId,
    stayTag: group.stayTag,
    interests: group.interests,
    categoryIds: group.categoryIds,
    placeIds: group.placeIds,
    keepsakeProductIds: group.keepsakeProductIds,
    relatedGroupIds: group.relatedGroupIds,
    rowVersion: group.rowVersion,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  }
}

// Stored text is read as written, so a draft saved before the author role left the contract may still hold it.
// The view names the fields it returns and so never carries a stored field the contract no longer has.
function draftView(doc: StoryDraft | null): StoryVersionView['draft'] {
  if (!doc)
    return null
  const { title, excerpt, authorName, coverMediaId, checkedOn, body } = doc
  return { title, excerpt, authorName, coverMediaId, ...(checkedOn === undefined ? {} : { checkedOn }), body }
}

export function storyVersionView(version: StoryVersion): StoryVersionView {
  return {
    groupId: version.groupId,
    storeId: version.storeId,
    language: version.language,
    status: version.status,
    slug: version.slug,
    draft: draftView(version.draft),
    published: draftView(version.published),
    publishedAt: version.publishedAt?.toISOString() ?? null,
    rowVersion: version.rowVersion,
    createdAt: version.createdAt.toISOString(),
    updatedAt: version.updatedAt.toISOString(),
  }
}

export function storyVersionTextView(text: StoryVersionText, publicUrl: (key: string) => string): StoryVersionTextView {
  return {
    status: text.status,
    title: text.title,
    cover: text.cover && mediaView(text.cover, publicUrl),
    body: text.body,
    media: text.media.map(file => mediaView(file, publicUrl)),
    updatedAt: text.updatedAt.toISOString(),
  }
}

// The list names each version's state only; the title and cover id the repository read for it are not part of the row.
export function storyListView({ entries, total, page, pageSize, tabs }: StoryListResult, publicUrl: (key: string) => string): StoryListView {
  const version = (row: StoryListEntry['languages']['en']) => row && { status: row.status, everPublished: row.everPublished, editsNotLive: row.editsNotLive, rowVersion: row.rowVersion, updatedAt: row.updatedAt.toISOString() }
  return {
    items: entries.map(entry => ({
      groupId: entry.groupId,
      kind: entry.kind,
      title: entry.title,
      cover: entry.cover && mediaView(entry.cover, publicUrl),
      languages: { en: version(entry.languages.en) ?? null, de: version(entry.languages.de) ?? null },
      updatedAt: entry.updatedAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    tabs,
  }
}

export function storyGroupDetailView({ group, versions }: StoryGroupRead): StoryGroupDetailView {
  return { ...storyGroupView(group), versions: { en: versions.en && storyVersionView(versions.en), de: versions.de && storyVersionView(versions.de) } }
}
