import { describe, expect, it } from 'vitest'

import { hoursGroups, hoursLine } from '@/features/pickup/lib/hours-line'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

function t(key: keyof typeof en, vars?: Record<string, string | number>) {
  return en[key].replace(/\{(\w+)\}/g, (_, name: string) => String(vars?.[name]))
}

function tDe(key: keyof typeof de, vars?: Record<string, string | number>) {
  return de[key].replace(/\{(\w+)\}/g, (_, name: string) => String(vars?.[name]))
}

const spans = (days: number[], opens: string, closes: string) => days.map(weekday => ({ weekday, opens, closes }))

describe('[E6.6][AC26] pickup hours line', () => {
  it('joins three or more days with the same span into a run', () => {
    expect(hoursLine(spans([1, 2, 3, 4, 5, 6], '10:00', '18:00'), t)).toBe('Mon to Sat 10:00 to 18:00')
    expect(hoursLine(spans([1, 2, 3], '10:00', '18:00'), t)).toBe('Mon to Wed 10:00 to 18:00')
  })

  it('lists one or two days by name', () => {
    expect(hoursLine(spans([1], '10:00', '18:00'), t)).toBe('Mon 10:00 to 18:00')
    expect(hoursLine(spans([1, 2], '10:00', '18:00'), t)).toBe('Mon, Tue 10:00 to 18:00')
  })

  it('joins several spans on a day with a comma', () => {
    expect(hoursLine([...spans([1], '09:00', '12:00'), ...spans([1], '14:00', '18:00')], t)).toBe('Mon 09:00 to 12:00, 14:00 to 18:00')
  })

  it('prints a crossing span as typed', () => {
    expect(hoursLine(spans([1], '22:00', '02:00'), t)).toBe('Mon 22:00 to 02:00')
  })

  it('joins day groups with a semicolon', () => {
    expect(hoursLine([...spans([1, 2, 3, 4, 5], '09:00', '18:00'), ...spans([6], '10:00', '14:00')], t)).toBe('Mon to Fri 09:00 to 18:00; Sat 10:00 to 14:00')
  })

  it('does not run over a gap in the days', () => {
    expect(hoursLine(spans([1, 2, 3, 5, 6, 7], '10:00', '18:00'), t)).toBe('Mon to Wed, Fri to Sun 10:00 to 18:00')
  })

  it('is empty for no spans, whatever the input order', () => {
    expect(hoursLine([], t)).toBe('')
    expect(hoursLine([...spans([3], '10:00', '12:00'), ...spans([1], '09:00', '12:00')], t)).toBe('Mon 09:00 to 12:00; Wed 10:00 to 12:00')
  })
})

describe('[S8-PICKUP-TABLE] pickup hours, one line per day group', () => {
  it('puts each day group on its own line, a middle dot before the time and a spaced en dash between the times', () => {
    expect(hoursGroups(spans([1, 2, 3, 4, 5, 6], '10:00', '18:00'), t)).toEqual(['Mon to Sat · 10:00 – 18:00'])
    expect(hoursGroups([...spans([1, 2, 3, 4, 5], '09:00', '18:30'), ...spans([6], '09:00', '16:00')], t)).toEqual([
      'Mon to Fri · 09:00 – 18:30',
      'Sat · 09:00 – 16:00',
    ])
  })

  it('keeps two spans of a day (a lunch break) on one line', () => {
    const lunch = [1, 2, 3, 4, 5].flatMap(weekday => [{ weekday, opens: '08:00', closes: '12:00' }, { weekday, opens: '13:30', closes: '18:00' }])

    expect(hoursGroups(lunch, t)).toEqual(['Mon to Fri · 08:00 – 12:00, 13:30 – 18:00'])
  })

  it('groups the days as the one-line version does: one or two days by name, no run over a gap', () => {
    expect(hoursGroups(spans([1, 2], '10:00', '18:00'), t)).toEqual(['Mon, Tue · 10:00 – 18:00'])
    expect(hoursGroups(spans([1, 2, 3, 5, 6, 7], '10:00', '18:00'), t)).toEqual(['Mon to Wed, Fri to Sun · 10:00 – 18:00'])
  })

  it('orders the lines by their first day, whatever the input order, and is empty for no spans', () => {
    expect(hoursGroups([...spans([3], '10:00', '12:00'), ...spans([1], '09:00', '12:00')], t)).toEqual(['Mon · 09:00 – 12:00', 'Wed · 10:00 – 12:00'])
    expect(hoursGroups([], t)).toEqual([])
  })

  it('writes the German day names and "bis" for a run', () => {
    expect(hoursGroups([...spans([1, 2, 3, 4, 5], '09:00', '18:30'), ...spans([6], '09:00', '16:00')], tDe)).toEqual([
      'Mo bis Fr · 09:00 – 18:30',
      'Sa · 09:00 – 16:00',
    ])
  })
})
