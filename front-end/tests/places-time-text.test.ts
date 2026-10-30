import { describe, expect, it } from 'vitest'

import { textOf, timeOf } from '@/features/places/lib/time-text'

describe('places time text', () => {
  it('reads HH:mm as a time and an empty or unreadable text as none', () => {
    expect(timeOf('09:05')?.toString()).toBe('09:05:00')
    expect(timeOf('')).toBeNull()
    expect(timeOf('9am')).toBeNull()
    expect(timeOf('24:00')).toBeNull()
  })

  it('shows a closing 24:00 as 00:00 and writes a closing 00:00 back as 24:00', () => {
    expect(timeOf('24:00', true)?.toString()).toBe('00:00:00')
    expect(textOf(timeOf('00:00', true), true)).toBe('24:00')
    expect(textOf(timeOf('00:00'))).toBe('00:00')
  })

  it('writes the time as HH:mm and no time as empty text', () => {
    expect(textOf(timeOf('18:30'))).toBe('18:30')
    expect(textOf(null)).toBe('')
  })
})
