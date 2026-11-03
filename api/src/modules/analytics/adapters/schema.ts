import { sql } from 'drizzle-orm'
import { bigint, check, date, pgSchema, text, unique } from 'drizzle-orm/pg-core'

// drizzle-kit loads this file on its own, so it imports nothing from this repo.
export const analytics = pgSchema('analytics')

// One row per day, referrer class and segment: a count and nothing else. No account, order, session, address or
// exact time (ADR-032). Rows are written by analytics.record_order_submit(), never by an insert from code.
export const dailyFunnels = analytics.table('daily_funnels', {
  day: date('day', { mode: 'string' }).notNull(),
  referrerClass: text('referrer_class').notNull(),
  segment: text('segment'),
  orderSubmits: bigint('order_submits', { mode: 'number' }).notNull().default(0),
}, table => [
  unique('daily_funnels_key').on(table.day, table.referrerClass, table.segment).nullsNotDistinct(),
  check('daily_funnels_referrer_check', sql`${table.referrerClass} in ('search', 'partner', 'social', 'direct', 'other')`),
  check('daily_funnels_segment_check', sql`${table.segment} in ('short_stay', 'multi_day')`),
  check('daily_funnels_counts_check', sql`${table.orderSubmits} >= 0`),
])
