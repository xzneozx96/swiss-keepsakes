import type { MessageKey } from '@/i18n/en'
import { DAYS } from '@/features/places/lib/hours'

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string

interface WeekSpan { weekday: number, opens: string, closes: string }

/**
 * The weekly hours as one line for a ticket: "Mon to Sat 10:00 to 18:00". Days with the same spans share a group,
 * three or more days in a row read "Mon to Wed", one or two read by name; groups join with "; ". A crossing span
 * prints as typed.
 */
export function hoursLine(spans: WeekSpan[], t: Translate): string {
  const range = (from: string, to: string) => t('pickup.hours.range', { from, to })
  const day = (n: number) => t(`places.day.${n}` as MessageKey)
  const textOf = (n: number) => spans.filter(s => s.weekday === n).map(s => range(s.opens, s.closes)).join(', ')
  const groups = new Map<string, number[][]>()

  for (const n of DAYS) {
    const text = textOf(n)

    if (text === '')
      continue
    const runs = groups.get(text) ?? []
    const last = runs.at(-1)

    // Only a day right after the previous day of the same text extends its run.
    if (last && last.at(-1) === n - 1 && textOf(n - 1) === text)
      last.push(n)
    else
      runs.push([n])
    groups.set(text, runs)
  }

  return [...groups]
    .sort(([, a], [, b]) => (a[0]?.[0] ?? 0) - (b[0]?.[0] ?? 0))
    .map(([text, runs]) => {
      const days = runs.map(run => run.length >= 3 ? range(day(run[0] as number), day(run.at(-1) as number)) : run.map(day).join(', '))

      return `${days.join(', ')} ${text}`
    })
    .join('; ')
}
