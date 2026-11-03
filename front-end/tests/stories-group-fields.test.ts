import type { GroupFields } from '@/features/stories/lib/group-fields'

import { describe, expect, it } from 'vitest'

import { groupBody, groupFieldsOf } from '@/features/stories/lib/group-fields'
import { storyGroupDetail } from './stories-harness'

const saved: GroupFields = groupFieldsOf(storyGroupDetail({}, { categoryIds: ['a', 'b'], interests: ['food-drink'] }) as never)

describe('[E4.3][AC87] what a group save sends', () => {
  it('[E4.3][AC87] groupBody sends only what changed', () => {
    expect(groupBody(saved, saved)).toEqual({})
    expect(groupBody({ ...saved, stayTag: 'multi_day' }, saved)).toEqual({ stayTag: 'multi_day' })
  })

  it('[E4.3][AC87] a list in a new order counts as changed, and a list replaces', () => {
    expect(groupBody({ ...saved, categoryIds: ['b', 'a'] }, saved)).toEqual({ categoryIds: ['b', 'a'] })
    expect(groupBody({ ...saved, interests: [] }, saved)).toEqual({ interests: [] })
  })

  it('[E4.3][AC30] kind and subject place are never sent: the group save cannot take them yet (D1)', () => {
    const typed = { ...saved, kind: 'editorial_review', subjectPlaceId: null } as GroupFields

    expect(groupBody(typed, saved)).toEqual({})
  })
})
