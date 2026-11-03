import { describe, expect, it } from 'vitest'

import { endsNextDay, hoursErrors } from '@/features/places/lib/hours'

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

describe('[E6.6][AC26] hoursErrors', () => {
  const span = (key: string, opens: string, closes: string) => ({ key, day: 1, opens, closes })

  it('names a missing or malformed time and equal times, and passes a crossing span and 24:00', () => {
    const errors = hoursErrors([
      span('a', '10:00', '10:00'),
      span('b', '10:', '18:00'),
      span('c', '09:00', ''),
      span('d', '22:00', '02:00'),
      span('e', '09:00', '24:00'),
      span('f', '24:00', '18:00'),
    ])

    expect(errors).toEqual({
      a: 'places.error.hoursSame',
      b: 'places.error.hoursMissing',
      c: 'places.error.hoursMissing',
      f: 'places.error.hoursMissing',
    })
  })

  it('has no errors for no spans', () => {
    expect(hoursErrors([])).toEqual({})
  })
})
