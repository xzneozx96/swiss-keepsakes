import type { StoryGroup as StoryGroupView, StoryVersion as StoryVersionView } from '@sk/api-contract'
import type { StoryGroup, StoryVersion } from '@sk/domain/content'

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

export function storyVersionView(version: StoryVersion): StoryVersionView {
  return {
    groupId: version.groupId,
    storeId: version.storeId,
    language: version.language,
    status: version.status,
    slug: version.slug,
    draft: version.draft,
    published: version.published,
    publishedAt: version.publishedAt?.toISOString() ?? null,
    rowVersion: version.rowVersion,
    createdAt: version.createdAt.toISOString(),
    updatedAt: version.updatedAt.toISOString(),
  }
}
