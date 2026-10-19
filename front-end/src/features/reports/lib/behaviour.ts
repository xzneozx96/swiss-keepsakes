import type { ReportTx } from './transactions'
import type { DemoData } from '@/features/demo/types'
import type { DayRange } from '@/lib/analytics'

import { zurichDayOf } from '@/features/catalog/lib/pickup'
import { prng } from '@/features/merchant/today/lib/demo-history'
import { linkOpens } from '@/features/partners/lib/link-opens'
import { calendarDay } from '@/lib/format'

export const FUNNEL_STEPS = [
  'visits',
  'viewed',
  'started',
  'sent',
  'paid',
  'completed',
] as const
export type FunnelStep = (typeof FUNNEL_STEPS)[number]

/**
 * One week of the demo history with partial tracking (spec §4.13: some visitors refuse
 * measurement or block it). Only browser-measured steps are affected; sales are business
 * data and always complete.
 */
const PARTIAL = { start: '2026-09-21', end: '2026-09-27', coverage: 0.62 }

const dayIn = (day: string, r: DayRange) => day >= r.start && day <= r.end

/** Stable per-day draws, so every reload shows the same behaviour. */
function draw(day: string, salt: number) {
  let seed = salt

  for (const ch of day) seed = (seed * 31 + ch.charCodeAt(0)) | 0

  return prng(seed)()
}

/** Direct visits (no partner link) on one day; invented, about 14–26 a day. */
const directVisits = (day: string) => Math.round(14 + draw(day, 11) * 12)

export interface FunnelCounts {
  steps: Record<FunnelStep, number>
  /** Share of the period's visits that were measured (1 = all). */
  coverage: number
}

/**
 * The funnel for one period and source (spec §4.13): visits = partner link opens plus direct
 * visits; viewed and started are measured in the browser (generated here, demo data); sent,
 * paid and completed come from the sales themselves. Each step never exceeds the one before.
 */
export function funnel(
  data: Pick<DemoData, 'referralVisits'>,
  txs: ReportTx[],
  range: DayRange,
  source: string,
): FunnelCounts {
  const opens = linkOpens(data).filter(
    o =>
      dayIn(zurichDayOf(o.at), range)
      && (source === 'all' || o.partnerId === source),
  )
  const opensByDay = new Map<string, number>()

  for (const o of opens) {
    const day = zurichDayOf(o.at)

    opensByDay.set(day, (opensByDay.get(day) ?? 0) + 1)
  }

  const days: string[] = []

  for (
    let d = calendarDay(range.start);
    d.toISOString().slice(0, 10) <= range.end;
    d.setUTCDate(d.getUTCDate() + 1)
  )
    days.push(d.toISOString().slice(0, 10))

  const sales = txs.filter(tx => dayIn(tx.day, range))
  const steps: Record<FunnelStep, number> = {
    visits: 0,
    viewed: 0,
    started: 0,
    sent: sales.length,
    paid: sales.filter(tx => tx.payments.length > 0).length,
    completed: sales.filter(tx => tx.status === 'completed').length,
  }
  let measured = 0
  let all = 0

  for (const day of days) {
    const visits
      = (opensByDay.get(day) ?? 0)
        + (source === 'all' || source === 'direct' ? directVisits(day) : 0)
    const sent = sales.filter(tx => tx.day === day).length
    const viewed = Math.round(visits * (0.62 + draw(day, 23) * 0.1))
    const started = Math.max(
      sent,
      Math.round(viewed * (0.22 + draw(day, 37) * 0.08)),
    )
    const share = dayIn(day, PARTIAL) ? PARTIAL.coverage : 1

    steps.visits += Math.round(Math.max(visits, viewed) * share)
    steps.viewed += Math.round(viewed * share)
    steps.started += Math.round(started * share)
    measured += visits * share
    all += visits
  }
  // Partial tracking can push a measured step below a business step; never show that.
  steps.started = Math.max(steps.started, steps.sent)
  steps.viewed = Math.max(steps.viewed, steps.started)
  steps.visits = Math.max(steps.visits, steps.viewed)

  return { steps, coverage: all ? measured / all : 1 }
}

function sumDays(range: DayRange, perDay: (day: string) => number): number {
  let sum = 0

  for (
    let d = calendarDay(range.start);
    d.toISOString().slice(0, 10) <= range.end;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const day = d.toISOString().slice(0, 10)
    const share = dayIn(day, PARTIAL) ? PARTIAL.coverage : 1

    sum += Math.round(perDay(day) * share)
  }

  return sum
}

/**
 * Article reads and clicks on the gifts and tours they link (spec §4.13: content and CTA
 * performance). Generated per article and day from a fixed seed; demo data.
 */
export function articleStats(articleId: string, range: DayRange) {
  let salt = 0

  for (const ch of articleId) salt = (salt * 31 + ch.charCodeAt(0)) | 0
  const views = sumDays(range, day => Math.round(2 + draw(day, salt) * 9))
  const clicks = Math.round(views * (0.05 + draw(articleId, 53) * 0.08))

  return { views, clicks }
}

/** The trip-advice widget: opened and started are measured (generated); sent is real. */
export function widgetStats(range: DayRange, sent: number) {
  const opened = sumDays(range, day => Math.round(2 + draw(day, 71) * 4))
  const started = Math.max(sent, Math.round(opened * 0.58))

  return { opened: Math.max(opened, started), started, sent }
}
