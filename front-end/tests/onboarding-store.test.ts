import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  forgetAnswers,
  getRecord,
  getServerRecord,
  hasAnswers,
  isUnanswered,
  markDismissed,
  resetAnswersStoreForTests,
  saveAnswers,
  saveInterests,
  saveStay,
  subscribe,
} from '@/features/onboarding/lib/answers-store'
import { EMPTY_RECORD, ONBOARDING_KEY } from '@/features/onboarding/lib/record'

const stored = () => JSON.parse(window.localStorage.getItem(ONBOARDING_KEY) ?? 'null')

beforeEach(() => {
  window.localStorage.clear()
  resetAnswersStoreForTests()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('[E4.5][AC37] the answers store', () => {
  it('starts empty and unanswered, and the server snapshot is the empty record', () => {
    expect(getRecord()).toEqual(EMPTY_RECORD)
    expect(getServerRecord()).toBe(EMPTY_RECORD)
    expect(isUnanswered(getRecord())).toBe(true)
    expect(hasAnswers(getRecord())).toBe(false)
  })

  it('saves the stay, writes it through to sk.onboarding and sets answeredAt', () => {
    saveStay('short_stay')

    expect(getRecord().segment).toBe('short_stay')
    expect(getRecord().answeredAt).not.toBeNull()
    expect(stored()).toMatchObject({ v: 1, segment: 'short_stay' })
    expect(hasAnswers(getRecord())).toBe(true)
    expect(isUnanswered(getRecord())).toBe(false)
  })

  it('saves interests, and clears answeredAt when nothing at all is answered', () => {
    saveInterests(['food-drink', 'food-drink'])

    expect(getRecord().interests).toEqual(['food-drink'])
    expect(getRecord().answeredAt).not.toBeNull()

    saveInterests([])

    expect(getRecord().answeredAt).toBeNull()
  })

  it('saveAnswers sets stay and interests together', () => {
    saveAnswers({ stay: 'multi_day', interests: ['lake-mountains'] })

    expect(getRecord()).toMatchObject({ segment: 'multi_day', interests: ['lake-mountains'] })
    expect(stored().interests).toEqual(['lake-mountains'])
  })

  it('markDismissed sets dismissedAt, keeps a saved stay and ends the unanswered state', () => {
    saveStay('multi_day')
    markDismissed()

    expect(getRecord().segment).toBe('multi_day')
    expect(getRecord().dismissedAt).not.toBeNull()

    resetAnswersStoreForTests()
    window.localStorage.clear()
    markDismissed()

    expect(isUnanswered(getRecord())).toBe(false)
    expect(hasAnswers(getRecord())).toBe(false)
  })

  it('forgetAnswers clears the answers and the skip mark', () => {
    saveAnswers({ stay: 'short_stay', interests: ['food-drink'] })
    forgetAnswers()

    expect(getRecord()).toEqual(EMPTY_RECORD)
    expect(stored()).toEqual(EMPTY_RECORD)
  })

  it('survives a reload: a new module state reads the stored record', () => {
    saveAnswers({ stay: 'short_stay', interests: ['history-culture'] })
    const before = getRecord()

    resetAnswersStoreForTests()

    expect(getRecord()).toEqual(before)
  })

  it('cleared site data gives the empty record', () => {
    saveStay('short_stay')
    window.localStorage.clear()
    resetAnswersStoreForTests()

    expect(getRecord()).toEqual(EMPTY_RECORD)
  })

  it('reads a malformed stored value as empty', () => {
    window.localStorage.setItem(ONBOARDING_KEY, '{nope')
    resetAnswersStoreForTests()

    expect(getRecord()).toEqual(EMPTY_RECORD)
  })

  it('keeps the same snapshot object until something changes, then a new one, and notifies', () => {
    const listener = vi.fn()
    const off = subscribe(listener)
    const first = getRecord()

    expect(getRecord()).toBe(first)
    saveStay('short_stay')

    expect(getRecord()).not.toBe(first)
    expect(listener).toHaveBeenCalledTimes(1)
    off()
  })

  it('with storage blocked it stays silent and the memory copy keeps working', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    expect(() => saveAnswers({ stay: 'multi_day', interests: ['food-drink'] })).not.toThrow()
    expect(getRecord()).toMatchObject({ segment: 'multi_day', interests: ['food-drink'] })
  })

  it('a storage event for the key refreshes the snapshot and notifies; other keys are ignored', () => {
    const listener = vi.fn()
    const off = subscribe(listener)

    window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ v: 1, segment: 'short_stay', interests: [], answeredAt: '2026-11-04T10:00:00.000Z', dismissedAt: null }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'other' }))

    expect(listener).not.toHaveBeenCalled()

    window.dispatchEvent(new StorageEvent('storage', { key: ONBOARDING_KEY }))

    expect(getRecord().segment).toBe('short_stay')
    expect(listener).toHaveBeenCalledTimes(1)

    window.localStorage.clear()
    window.dispatchEvent(new StorageEvent('storage', { key: null }))

    expect(getRecord()).toEqual(EMPTY_RECORD)
    off()
  })

  it('stops listening to storage events when the last subscriber leaves', () => {
    const listener = vi.fn()

    subscribe(listener)()
    window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ v: 1, segment: 'short_stay', interests: [], answeredAt: null, dismissedAt: null }))
    window.dispatchEvent(new StorageEvent('storage', { key: ONBOARDING_KEY }))

    expect(listener).not.toHaveBeenCalled()
  })
})
