import type { StoryGroupDetail, StoryGroupSaveBody } from '@sk/api-contract'

/**
 * The shared facts of a story group that the Details cards edit and one group save carries. `kind` and `subjectPlaceId`
 * are not here: the group save cannot take them yet (the Editorial review card waits on decision D1), so the card that
 * needs them adds them here and to `groupBody` together with the API change.
 */
export type GroupFields = Pick<StoryGroupDetail, 'stayTag' | 'interests' | 'categoryIds' | 'placeIds' | 'keepsakeProductIds' | 'relatedGroupIds'>

const KEYS = ['stayTag', 'interests', 'categoryIds', 'placeIds', 'keepsakeProductIds', 'relatedGroupIds'] as const

export function groupFieldsOf(group: GroupFields): GroupFields {
  return { stayTag: group.stayTag, interests: group.interests, categoryIds: group.categoryIds, placeIds: group.placeIds, keepsakeProductIds: group.keepsakeProductIds, relatedGroupIds: group.relatedGroupIds }
}

const same = (a: unknown, b: unknown) => Array.isArray(a) && Array.isArray(b) ? a.length === b.length && a.every((item, index) => item === b[index]) : a === b

/** The partial body of a group save: only the fields that differ from the saved ones (a list in a new order counts, a list replaces). */
export function groupBody(typed: GroupFields, saved: GroupFields): StoryGroupSaveBody {
  const body: Record<string, unknown> = {}

  for (const key of KEYS) {
    if (!same(typed[key], saved[key]))
      body[key] = typed[key]
  }

  return body as StoryGroupSaveBody
}
