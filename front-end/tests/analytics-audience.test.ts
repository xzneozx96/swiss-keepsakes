import { describe, expect, it } from 'vitest'
import { readAudience } from '@/lib/analytics/audience'

function storageWith(value: string | null) {
  return { getItem: (key: string) => (key === 'sk.onboarding' ? value : null) }
}

function record(fields: Record<string, unknown>) {
  return JSON.stringify({ v: 1, segment: null, interests: [], answeredAt: null, dismissedAt: null, ...fields })
}

describe('[E8.7][AC37][AC60][AC-6] readAudience', () => {
  it('returns the segment and the two interests of a guest who answered multi-day with two interests', () => {
    const stored = record({ segment: 'multi_day', interests: ['history-culture', 'food-drink'], answeredAt: '2026-11-03T09:00:00Z' })

    expect(readAudience(storageWith(stored))).toEqual({ segment: 'multi_day', interests: ['history-culture', 'food-drink'] })
  })

  it('returns short_stay as a segment', () => {
    expect(readAudience(storageWith(record({ segment: 'short_stay', interests: ['lake-mountains'] })))).toEqual({ segment: 'short_stay', interests: ['lake-mountains'] })
  })

  it('returns nothing for a guest who has not answered', () => {
    expect(readAudience(storageWith(null))).toEqual({})
    expect(readAudience(storageWith(record({})))).toEqual({})
    expect(readAudience(storageWith(record({ dismissedAt: '2026-11-03T09:00:00Z' })))).toEqual({})
  })

  it('leaves out a segment that is not short_stay or multi_day (both, null, anything else)', () => {
    expect(readAudience(storageWith(record({ segment: 'both', interests: ['food-drink'] })))).toEqual({ interests: ['food-drink'] })
    expect(readAudience(storageWith(record({ segment: 'weekend' })))).toEqual({})
    expect(readAudience(storageWith(record({ segment: 7 })))).toEqual({})
  })

  it('keeps only closed interests, once each', () => {
    const stored = record({ segment: 'multi_day', interests: ['food-drink', 'nightlife', 'food-drink', 3, null, 'shopping-keepsakes'] })

    expect(readAudience(storageWith(stored))).toEqual({ segment: 'multi_day', interests: ['food-drink', 'shopping-keepsakes'] })
  })

  it('leaves out interests when none is left, or when it is not an array', () => {
    expect(readAudience(storageWith(record({ segment: 'multi_day', interests: ['nightlife'] })))).toEqual({ segment: 'multi_day' })
    expect(readAudience(storageWith(record({ segment: 'multi_day', interests: 'food-drink' })))).toEqual({ segment: 'multi_day' })
  })

  it('sends nothing but closed values: other fields of the record never come through', () => {
    const result = readAudience(storageWith(record({ segment: 'multi_day', interests: ['food-drink'], email: 'a@b.ch', answeredAt: 'x' })))

    expect(Object.keys(result).sort()).toEqual(['interests', 'segment'])
  })

  it.each(['{', 'null', '[]', '"text"', '42', record({ v: 2, segment: 'multi_day' }), JSON.stringify({ segment: 'multi_day' }), ''])('returns nothing for a malformed or unknown record: %s', (stored) => {
    expect(readAudience(storageWith(stored))).toEqual({})
  })

  it('never throws: a storage that throws, or no storage at all, gives nothing', () => {
    const throwing = { getItem: () => { throw new Error('SecurityError') } }

    expect(readAudience(throwing)).toEqual({})
    expect(readAudience(undefined)).toEqual({})
    expect(readAudience(null)).toEqual({})
  })

  it('only reads: it never calls setItem or removeItem', () => {
    const calls: string[] = []
    const spy = {
      getItem: () => record({ segment: 'multi_day' }),
      setItem: () => calls.push('set'),
      removeItem: () => calls.push('remove'),
    }

    readAudience(spy)

    expect(calls).toEqual([])
  })
})
