import { calendarDay, numberFormat } from '@/lib/format'

/** The Overview analytics periods. "month" runs from the 1st to today. */
export const PERIODS = ['7d', '30d', 'month'] as const
export type PeriodId = (typeof PERIODS)[number]

/** Inclusive Zurich calendar days, YYYY-MM-DD. */
export interface DayRange {
  start: string
  end: string
}

function addDays(isoDate: string, days: number): string {
  const d = calendarDay(isoDate)

  d.setUTCDate(d.getUTCDate() + days)

  return d.toISOString().slice(0, 10)
}

/** The period that ends today and the one before it, the same length (month: same days). */
export function periodRanges(
  period: PeriodId,
  today: string,
): { current: DayRange, previous: DayRange } {
  if (period === 'month') {
    const start = `${today.slice(0, 8)}01`
    const prevStart = `${addDays(start, -1).slice(0, 8)}01`
    const prevMonthEnd = addDays(start, -1)
    const sameDay = `${prevStart.slice(0, 8)}${today.slice(8)}`

    return {
      current: { start, end: today },
      previous: {
        start: prevStart,
        end: sameDay < prevMonthEnd ? sameDay : prevMonthEnd,
      },
    }
  }
  const length = period === '7d' ? 7 : 30

  return {
    current: { start: addDays(today, 1 - length), end: today },
    previous: {
      start: addDays(today, 1 - 2 * length),
      end: addDays(today, -length),
    },
  }
}

export type DeltaTone = 'good' | 'bad' | 'neutral'
export type Polarity = 'up' | 'down' | 'neutral'

/**
 * A change against the previous period, as the stat cards show it: "+12%", "−4%", "±0%",
 * or "" when the previous value is 0 (never ∞). The tone is direction × polarity.
 */
export function deltaOf(
  value: number,
  previous: number,
  polarity: Polarity,
  locale: string,
): {
  delta: string
  direction: 'up' | 'down' | 'flat' | 'none'
  tone: DeltaTone
} {
  const change = previous ? (value - previous) / previous : null
  const rounded = change === null ? null : Math.round(change * 100)
  const direction
    = rounded === null
      ? 'none'
      : rounded > 0
        ? 'up'
        : rounded < 0
          ? 'down'
          : 'flat'
  const tone: DeltaTone
    = direction === 'up' || direction === 'down'
      ? polarity === 'neutral'
        ? 'neutral'
        : (direction === 'up') === (polarity === 'up')
            ? 'good'
            : 'bad'
      : 'neutral'
  const delta
    = change === null
      ? ''
      : numberFormat(locale, {
          style: 'percent',
          signDisplay: 'exceptZero',
        })
          .format(Math.round(change * 100) / 100)
          .replace('-', '−')

  return { delta, direction, tone }
}

/** Monday of the week that contains `day` (YYYY-MM-DD). */
export function mondayOf(day: string): string {
  const fromMonday = (calendarDay(day).getUTCDay() + 6) % 7

  return addDays(day, -fromMonday)
}
