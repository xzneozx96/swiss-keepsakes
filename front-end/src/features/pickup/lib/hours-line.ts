import type { MessageKey } from '@/i18n/en'
import { DAYS } from '@/features/places/lib/hours'

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string

interface WeekSpan { weekday: number, opens: string, closes: string }

/**
 * The day groups of the weekly hours, ordered by their first day: days with the same spans share a group, three or
 * more days in a row read "Mon to Wed", one or two read by name. `span` writes one time range; a day's ranges join
 * with ", ". A crossing span prints as typed.
 */
function dayGroups(spans: WeekSpan[], t: Translate, span: (opens: string, closes: string) => string) {
  const day = (n: number) => t(`places.day.${n}` as MessageKey)
  const textOf = (n: number) => spans.filter(s => s.weekday === n).map(s => span(s.opens, s.closes)).join(', ')
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
    .map(([text, runs]) => ({
      days: runs.map(run => run.length >= 3 ? t('pickup.hours.range', { from: day(run[0] as number), to: day(run.at(-1) as number) }) : run.map(day).join(', ')).join(', '),
      text,
    }))
}

/** The weekly hours as one line for a ticket: "Mon to Sat 10:00 to 18:00"; groups join with "; ". */
export function hoursLine(spans: WeekSpan[], t: Translate): string {
  return dayGroups(spans, t, (from, to) => t('pickup.hours.range', { from, to }))
    .map(({ days, text }) => `${days} ${text}`)
    .join('; ')
}

/**
 * The weekly hours as one line per day group, for the pickup table: "Mon to Sat · 10:00 – 18:00". A day with two
 * spans keeps them on its line: "Mon · 08:00 – 12:00, 13:30 – 18:00". Empty for no spans.
 */
export function hoursGroups(spans: WeekSpan[], t: Translate): string[] {
  return dayGroups(spans, t, (opens, closes) => `${opens} – ${closes}`).map(({ days, text }) => `${days} · ${text}`)
}
