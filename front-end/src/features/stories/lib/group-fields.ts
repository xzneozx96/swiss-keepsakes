import type { StoryGroupDetail, StoryGroupSaveBody } from '@sk/api-contract'

/**
 * The shared facts of a story group that the Details cards edit and one group save carries. `kind` and `subjectPlaceId` go
 * together (the database check `story_groups_subject_check`): a review names its place, a story names none.
 */
export type GroupFields = Pick<StoryGroupDetail, 'kind' | 'subjectPlaceId' | 'stayTag' | 'interests' | 'categoryIds' | 'placeIds' | 'keepsakeProductIds' | 'relatedGroupIds'>

const KEYS = ['stayTag', 'interests', 'categoryIds', 'placeIds', 'keepsakeProductIds', 'relatedGroupIds'] as const

export function groupFieldsOf(group: GroupFields): GroupFields {
  return { kind: group.kind, subjectPlaceId: group.subjectPlaceId, stayTag: group.stayTag, interests: group.interests, categoryIds: group.categoryIds, placeIds: group.placeIds, keepsakeProductIds: group.keepsakeProductIds, relatedGroupIds: group.relatedGroupIds }
}

const same = (a: unknown, b: unknown) => Array.isArray(a) && Array.isArray(b) ? a.length === b.length && a.every((item, index) => item === b[index]) : a === b

/** The partial body of a group save: only the fields that differ from the saved ones (a list in a new order counts, a list replaces). */
export function groupBody(typed: GroupFields, saved: GroupFields): StoryGroupSaveBody {
  const body: Record<string, unknown> = {}

  for (const key of KEYS) {
    if (!same(typed[key], saved[key]))
      body[key] = typed[key]
  }

  // A review with no place yet is held in the editor: the API refuses it, so neither field goes until the place is chosen.
  const pending = typed.kind === 'editorial_review' && !typed.subjectPlaceId

  if (!pending && (typed.kind !== saved.kind || typed.subjectPlaceId !== saved.subjectPlaceId)) {
    body.kind = typed.kind
    body.subjectPlaceId = typed.kind === 'story' ? null : typed.subjectPlaceId
  }

  return body as StoryGroupSaveBody
}
