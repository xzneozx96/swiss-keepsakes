import type { PinDate } from '@sk/domain/content'
import { describe, expect, it, vi } from 'vitest'
import { pickLanguage } from '../../../src/modules/content/application/language.ts'
import { hasEnded, nextDate, withParents } from '../../../src/modules/content/application/pin-dates.ts'
import { createTtlCache } from '../../../src/modules/content/application/ttl-cache.ts'
import { createManualClock } from '../../support/manual-clock.ts'

function date(over: Partial<PinDate>): PinDate {
  return { id: 'd', firstDay: '2090-11-14', lastDay: '2090-11-14', startTime: null, endTime: null, ...over }
}

describe('[E2.12][AC64] pickLanguage', () => {
  it('falls back to the other language, prefers the requested one, and returns null when none', () => {
    expect(pickLanguage(['en'], 'de')).toEqual({ language: 'en', fallback: true })
    expect(pickLanguage(['en', 'de'], 'de')).toEqual({ language: 'de', fallback: false })
    expect(pickLanguage([], 'de')).toBeNull()
  })
})

describe('[E2.12][AC86] hasEnded and nextDate in Europe/Zurich', () => {
  const evening = date({ id: 'e', startTime: '19:30', endTime: '21:00' })

  it('keeps a dated evening until its end time (CET)', () => {
    const before = new Date('2090-11-10T12:00:00Z')

    expect(hasEnded(evening, before)).toBe(false)
    expect(nextDate([evening], before)).toEqual(evening)
    expect(hasEnded(evening, new Date('2090-11-14T19:59:00Z'))).toBe(false)
    expect(hasEnded(evening, new Date('2090-11-14T20:01:00Z'))).toBe(true)
    expect(nextDate([evening], new Date('2090-11-14T20:01:00Z'))).toBe('ended')
  })

  it('ends at exactly the end time', () => {
    expect(hasEnded(evening, new Date('2090-11-14T20:00:00Z'))).toBe(true)
  })

  it('treats no end time as 24:00', () => {
    const day = date({})

    expect(hasEnded(day, new Date('2090-11-14T22:59:00Z'))).toBe(false)
    expect(hasEnded(day, new Date('2090-11-14T23:00:00Z'))).toBe(true)
  })

  it('uses summer time (CEST) in July', () => {
    const day = date({ firstDay: '2090-07-14', lastDay: '2090-07-14' })

    expect(hasEnded(day, new Date('2090-07-14T21:59:00Z'))).toBe(false)
    expect(hasEnded(day, new Date('2090-07-14T22:00:00Z'))).toBe(true)
  })

  it('returns null for no dates', () => {
    expect(nextDate([], new Date('2090-11-10T12:00:00Z'))).toBeNull()
  })

  it('returns the future date when one is past', () => {
    const past = date({ id: 'p', firstDay: '2090-11-01', lastDay: '2090-11-01' })
    const future = date({ id: 'f', firstDay: '2090-11-20', lastDay: '2090-11-20' })

    expect(nextDate([future, past], new Date('2090-11-10T12:00:00Z'))).toEqual(future)
  })

  it('orders by first day, then start time with nulls first', () => {
    const a = date({ id: 'a', startTime: '10:00' })
    const b = date({ id: 'b', startTime: null })
    const c = date({ id: 'c', firstDay: '2090-11-13', lastDay: '2090-11-20' })

    expect(nextDate([a, b], new Date('2090-11-10T12:00:00Z'))).toEqual(b)
    expect(nextDate([a, b, c], new Date('2090-11-10T12:00:00Z'))).toEqual(c)
  })
})

describe('[E2.12][AC88] withParents', () => {
  const parentOf = new Map<string, string | null>([['c1', 'p1'], ['p1', null]])

  it('adds the parent of a sub-category, sorted', () => {
    expect(withParents(['c1'], parentOf)).toEqual(['c1', 'p1'])
  })

  it('lists the parent once when both are present', () => {
    expect(withParents(['p1', 'c1'], parentOf)).toEqual(['c1', 'p1'])
  })

  it('returns an empty list for no categories', () => {
    expect(withParents([], parentOf)).toEqual([])
  })
})

describe('[E2.12][AC45] ttl cache', () => {
  it('loads again only after the TTL', async () => {
    const clock = createManualClock(new Date('2090-11-10T12:00:00Z'))
    const cache = createTtlCache<number>(clock, 60_000)
    const load = vi.fn(async () => 1)

    await cache.get('k', load)
    clock.advance(59_999)
    await cache.get('k', load)
    expect(load).toHaveBeenCalledTimes(1)
    clock.advance(1)
    await cache.get('k', load)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('loads once for parallel misses', async () => {
    const cache = createTtlCache<number>(createManualClock(new Date('2090-11-10T12:00:00Z')), 60_000)
    const load = vi.fn(async () => 1)

    await Promise.all([cache.get('k', load), cache.get('k', load)])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('retries after a rejected load', async () => {
    const cache = createTtlCache<number>(createManualClock(new Date('2090-11-10T12:00:00Z')), 60_000)
    const load = vi.fn<() => Promise<number>>().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(2)

    await expect(cache.get('k', load)).rejects.toThrow('boom')
    await expect(cache.get('k', load)).resolves.toBe(2)
    expect(load).toHaveBeenCalledTimes(2)
  })
})
