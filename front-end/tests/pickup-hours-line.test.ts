import { describe, expect, it } from 'vitest'

import { hoursGroups } from '@/features/pickup/lib/hours-line'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

function t(key: keyof typeof en, vars?: Record<string, string | number>) {
  return en[key].replace(/\{(\w+)\}/g, (_, name: string) => String(vars?.[name]))
}

function tDe(key: keyof typeof de, vars?: Record<string, string | number>) {
  return de[key].replace(/\{(\w+)\}/g, (_, name: string) => String(vars?.[name]))
}

const spans = (days: number[], opens: string, closes: string) => days.map(weekday => ({ weekday, opens, closes }))

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

  it('lists one or two days by name and does not run over a gap in the days', () => {
    expect(hoursGroups(spans([1, 2], '10:00', '18:00'), t)).toEqual(['Mon, Tue · 10:00 – 18:00'])
    expect(hoursGroups(spans([1, 2, 3, 5, 6, 7], '10:00', '18:00'), t)).toEqual(['Mon to Wed, Fri to Sun · 10:00 – 18:00'])
  })

  it('orders the lines by their first day, whatever the input order, and is empty for no spans', () => {
    expect(hoursGroups([...spans([3], '10:00', '12:00'), ...spans([1], '09:00', '12:00')], t)).toEqual(['Mon · 09:00 – 12:00', 'Wed · 10:00 – 12:00'])
    expect(hoursGroups([], t)).toEqual([])
  })

  it('prints a crossing span as typed', () => {
    expect(hoursGroups(spans([1], '22:00', '02:00'), t)).toEqual(['Mon · 22:00 – 02:00'])
  })

  it('writes the German day names and "bis" for a run', () => {
    expect(hoursGroups([...spans([1, 2, 3, 4, 5], '09:00', '18:30'), ...spans([6], '09:00', '16:00')], tDe)).toEqual([
      'Mo bis Fr · 09:00 – 18:30',
      'Sa · 09:00 – 16:00',
    ])
  })
})
