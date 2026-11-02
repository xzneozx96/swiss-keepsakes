import { describe, expect, it } from 'vitest'

import { endsNextDay } from '@/features/places/lib/hours'

describe('[T-013] hours that cross midnight', () => {
  it('a closing time before the opening time ends the next day; 24:00 and a later close do not', () => {
    expect(endsNextDay({ opens: '18:00', closes: '02:00' })).toBe(true)
    expect(endsNextDay({ opens: '22:00', closes: '00:00' })).toBe(true)
    expect(endsNextDay({ opens: '18:00', closes: '24:00' })).toBe(false)
    expect(endsNextDay({ opens: '09:00', closes: '18:00' })).toBe(false)
    expect(endsNextDay({ opens: '09:00', closes: '09:00' })).toBe(false)
    expect(endsNextDay({ opens: '', closes: '02:00' })).toBe(false)
  })
})
