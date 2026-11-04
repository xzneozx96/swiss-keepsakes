import { describe, expect, it } from 'vitest'
import { EMPTY_RECORD, parseRecord } from '@/features/onboarding/lib/record'

const good = { v: 1, segment: 'multi_day', interests: ['food-drink', 'lake-mountains'], answeredAt: '2026-11-04T10:00:00.000Z', dismissedAt: null }

describe('[E4.5][AC37] parseRecord reads the sk.onboarding record', () => {
  it('reads a valid record as written', () => {
    expect(parseRecord(good)).toEqual(good)
  })

  it('gives the empty record for null, a non-object, an unknown version or a missing version', () => {
    for (const raw of [null, undefined, 'x', 3, [], { ...good, v: 2 }, { segment: 'short_stay' }])
      expect(parseRecord(raw)).toEqual(EMPTY_RECORD)
  })

  it('empty record means no answers and not skipped', () => {
    expect(EMPTY_RECORD).toEqual({ v: 1, segment: null, interests: [], answeredAt: null, dismissedAt: null })
  })

  it('accepts only short_stay and multi_day as the segment', () => {
    expect(parseRecord({ ...good, segment: 'short_stay' }).segment).toBe('short_stay')
    expect(parseRecord({ ...good, segment: 'both' }).segment).toBeNull()
    expect(parseRecord({ ...good, segment: 'short-stay' }).segment).toBeNull()
    expect(parseRecord({ ...good, segment: 4 }).segment).toBeNull()
  })

  it('keeps known interests once each, in order, and drops the rest', () => {
    expect(parseRecord({ ...good, interests: ['food-drink', 'nope', 'food-drink', 7, 'history-culture'] }).interests).toEqual(['food-drink', 'history-culture'])
    expect(parseRecord({ ...good, interests: 'food-drink' }).interests).toEqual([])
  })

  it('keeps a bad date as null and does not drop the rest of the record', () => {
    const record = parseRecord({ ...good, answeredAt: 5, dismissedAt: 'not a date' })

    expect(record.answeredAt).toBeNull()
    expect(record.dismissedAt).toBeNull()
    expect(record.segment).toBe('multi_day')
  })
})
