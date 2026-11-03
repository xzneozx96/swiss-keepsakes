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

  const place = '0198a000-0000-7000-8000-000000000009'

  it('[E4.3][AC30] AC-4 a review with a place sends kind and subject place together', () => {
    expect(groupBody({ ...saved, kind: 'editorial_review', subjectPlaceId: place }, saved)).toEqual({ kind: 'editorial_review', subjectPlaceId: place })
  })

  it('[E4.3][AC30] AC-4 switching a review off sends kind story with a null subject place', () => {
    const review: GroupFields = { ...saved, kind: 'editorial_review', subjectPlaceId: place }

    expect(groupBody({ ...review, kind: 'story', subjectPlaceId: null }, review)).toEqual({ kind: 'story', subjectPlaceId: null })
  })

  it('[E4.3][AC30] AC-4 a review with no place yet sends nothing for kind, but other changes still go', () => {
    const typed: GroupFields = { ...saved, kind: 'editorial_review', subjectPlaceId: null }

    expect(groupBody(typed, saved)).toEqual({})
    expect(groupBody({ ...typed, stayTag: 'multi_day' }, saved)).toEqual({ stayTag: 'multi_day' })
  })

  it('[E4.3][AC30] unchanged kind and subject place send nothing', () => {
    expect(groupBody({ ...saved, kind: 'editorial_review', subjectPlaceId: place }, { ...saved, kind: 'editorial_review', subjectPlaceId: place })).toEqual({})
  })
})
