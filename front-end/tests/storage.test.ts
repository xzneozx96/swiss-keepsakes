import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readStored, writeStored } from '@/lib/storage'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('readStored', () => {
  it('returns the fallback for a missing key', () => {
    expect(readStored('sk.missing', 'fallback')).toBe('fallback')
  })

  it('returns the parsed value', () => {
    window.localStorage.setItem('sk.value', JSON.stringify({ a: 1 }))

    expect(readStored('sk.value', null)).toEqual({ a: 1 })
  })

  it('returns the fallback when the stored text is not JSON', () => {
    window.localStorage.setItem('sk.broken', '{not json')

    expect(readStored('sk.broken', 'fallback')).toBe('fallback')
  })
})

describe('writeStored', () => {
  it('keeps the value and says so', () => {
    expect(writeStored('sk.value', { a: 1 })).toBe('kept')
    expect(window.localStorage.getItem('sk.value')).toBe('{"a":1}')
  })

  it('reports full storage so the user can be told', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })

    expect(writeStored('sk.value', 'x')).toBe('full')
  })

  it('stays silent when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    expect(writeStored('sk.value', 'x')).toBe('unavailable')
  })
})
