import type { NextDate, PublicMapItem } from '@sk/api-contract'

import { describe, expect, it } from 'vitest'

import { eventsSplit } from '@/features/home/lib/events'

function event(slug: string, next: Partial<NextDate> & { firstDay: string }): PublicMapItem {
  return {
    id: `00000000-0000-4000-8000-${String(slug.length).padStart(12, '0')}`,
    slug,
    latitude: 47.05,
    longitude: 8.3,
    title: slug,
    language: 'en',
    categoryIds: [],
    stayTag: 'both',
    interests: [],
    nextDate: { lastDay: next.firstDay, startTime: null, endTime: null, ...next },
    hasMainStory: false,
    mainStorySlug: null,
    photoUrl: null,
    photoVariants: [],
    mustVisit: false,
    tip: '',
  }
}

const slugs = (pins: PublicMapItem[]) => pins.map(pin => pin.slug)
// 4 November 2026, 10:00 in Zurich (09:00 UTC, winter time).
const NOON = new Date('2026-11-04T09:00:00Z')

describe('[E4.13][AC54][AC95] the events split', () => {
  it('puts a start within 7 days and a running event in This week, and a later one in Coming up (AC-1)', () => {
    const pins = [
      event('later', { firstDay: '2026-11-20' }),
      event('soon', { firstDay: '2026-11-08' }),
      event('running', { firstDay: '2026-11-01', lastDay: '2026-11-06' }),
    ]
    const split = eventsSplit(pins, NOON)

    expect(slugs(split.thisWeek)).toEqual(['running', 'soon'])
    expect(slugs(split.comingUp)).toEqual(['later'])
    expect(split.seeAll).toBe(false)
  })

  it('counts day 7 in This week and day 8 as later', () => {
    const split = eventsSplit([event('d8', { firstDay: '2026-11-12' }), event('d7', { firstDay: '2026-11-11' })], NOON)

    expect(slugs(split.thisWeek)).toEqual(['d7'])
    expect(slugs(split.comingUp)).toEqual(['d8'])
  })

  it('shows three later events with no link, and four with the link and only three listed (AC-2)', () => {
    const later = ['a', 'b', 'c', 'd'].map((slug, i) => event(slug, { firstDay: `2026-12-0${i + 1}` }))

    expect(eventsSplit(later.slice(0, 3), NOON)).toMatchObject({ seeAll: false })
    const four = eventsSplit([...later].reverse(), NOON)

    expect(slugs(four.comingUp)).toEqual(['a', 'b', 'c'])
    expect(four.seeAll).toBe(true)
  })

  it('does not count This week events towards the link', () => {
    const pins = [event('now', { firstDay: '2026-11-05' }), ...['a', 'b', 'c'].map((slug, i) => event(slug, { firstDay: `2026-12-0${i + 1}` }))]

    expect(eventsSplit(pins, NOON).seeAll).toBe(false)
  })

  it('returns nothing for no dated pin', () => {
    const undated = { ...event('x', { firstDay: '2026-11-05' }), nextDate: null }

    expect(eventsSplit([undated], NOON)).toEqual({ thisWeek: [], comingUp: [], seeAll: false })
  })

  it('drops an event whose last day was yesterday in Zurich, also from a cached list (AC-4)', () => {
    const split = eventsSplit([event('gone', { firstDay: '2026-11-03' }), event('kept', { firstDay: '2026-11-04' })], NOON)

    expect(slugs(split.thisWeek)).toEqual(['kept'])
  })

  it('reads the Zurich day at midnight: 23:30 UTC on the 3rd is already the 4th', () => {
    const justAfterMidnight = new Date('2026-11-03T23:30:00Z')

    expect(slugs(eventsSplit([event('gone', { firstDay: '2026-11-03' })], justAfterMidnight).thisWeek)).toEqual([])
    expect(slugs(eventsSplit([event('today', { firstDay: '2026-11-04' })], justAfterMidnight).thisWeek)).toEqual(['today'])
    expect(slugs(eventsSplit([event('gone', { firstDay: '2026-11-03' })], new Date('2026-11-03T22:30:00Z')).thisWeek)).toEqual(['gone'])
  })

  it('drops today\'s event once its end time has passed in Zurich, and keeps it before', () => {
    const tonight = event('tonight', { firstDay: '2026-11-04', startTime: '18:00:00', endTime: '20:30:00' })

    expect(slugs(eventsSplit([tonight], new Date('2026-11-04T19:29:00Z')).thisWeek)).toEqual(['tonight'])
    expect(slugs(eventsSplit([tonight], new Date('2026-11-04T19:30:00Z')).thisWeek)).toEqual([])
  })

  it('keeps today\'s event with a start time and no end time until the day ends', () => {
    const late = event('late', { firstDay: '2026-11-04', startTime: '22:00:00' })

    expect(slugs(eventsSplit([late], new Date('2026-11-04T22:30:00Z')).thisWeek)).toEqual(['late'])
  })

  it('uses summer time: 20:30 Zurich on 4 July is 18:30 UTC', () => {
    const tonight = event('tonight', { firstDay: '2026-07-04', endTime: '20:30:00' })

    expect(slugs(eventsSplit([tonight], new Date('2026-07-04T18:29:00Z')).thisWeek)).toEqual(['tonight'])
    expect(slugs(eventsSplit([tonight], new Date('2026-07-04T18:30:00Z')).thisWeek)).toEqual([])
  })

  it('applies the end time to the last day of a range only', () => {
    const range = event('range', { firstDay: '2026-11-03', lastDay: '2026-11-05', endTime: '10:00:00' })

    expect(slugs(eventsSplit([range], NOON).thisWeek)).toEqual(['range'])
  })
})
