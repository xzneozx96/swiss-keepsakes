import { MAX_OFFSET } from '@sk/api-contract'
import { describe, expect, it } from 'vitest'
import { offsetOf } from '../../../src/platform/db/offset.ts'

describe('[ADR-033] offsetOf', () => {
  it('skips the rows of the pages before', () => {
    expect(offsetOf(1, 10)).toBe(0)
    expect(offsetOf(3, 20)).toBe(40)
  })

  it('allows the limit itself and refuses a larger skip, a page below 1 and a fraction', () => {
    expect(offsetOf(1001, 10)).toBe(MAX_OFFSET)
    expect(() => offsetOf(1002, 10)).toThrow(RangeError)
    expect(() => offsetOf(0, 10)).toThrow(RangeError)
    expect(() => offsetOf(1.5, 10)).toThrow(RangeError)
  })
})
