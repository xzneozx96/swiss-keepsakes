import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFunnelCounter, makeRecordOrderSubmit } from '../../src/modules/analytics/index.ts'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()
const recordOrderSubmit = makeRecordOrderSubmit({ funnels: createFunnelCounter(db) })

beforeEach(async () => {
  await pool.query('delete from analytics.daily_funnels')
})

afterAll(async () => {
  await pool.end()
})

interface Row { day: string, referrer_class: string, segment: string | null, order_submits: string }

async function rows(): Promise<Row[]> {
  const { rows } = await pool.query<Row>(
    `select day::text, referrer_class, segment, order_submits::text from analytics.daily_funnels order by day, referrer_class, segment`,
  )
  return rows
}

async function failure(promise: Promise<unknown>): Promise<{ code?: string, constraint?: string }> {
  try {
    await promise
  }
  catch (error) {
    return error as { code?: string, constraint?: string }
  }
  throw new Error('the statement was expected to fail and succeeded')
}

describe('[E8.7][AC37][AC60] analytics.daily_funnels', () => {
  it('[AC-1] schema analytics holds daily_funnels and no other table', async () => {
    const { rows: tables } = await pool.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'analytics' order by table_name`,
    )
    expect(tables.map(t => t.table_name)).toEqual(['daily_funnels'])
  })

  it('[AC-1] daily_funnels has no column for an account, order, partner, referral, session, address or exact time', async () => {
    const { rows: columns } = await pool.query<{ column_name: string, data_type: string }>(
      `select column_name, data_type from information_schema.columns where table_schema = 'analytics' and table_name = 'daily_funnels'`,
    )
    expect(columns.map(c => c.column_name).sort()).toEqual(['day', 'order_submits', 'referrer_class', 'segment'])
    expect(columns.map(c => c.column_name).join(' ')).not.toMatch(/account|order_id|partner|referral|session|address|user|ip\b/)
    expect(columns.find(c => c.column_name === 'day')?.data_type).toBe('date')
    expect(columns.some(c => c.data_type.includes('timestamp') || c.data_type === 'uuid')).toBe(false)
  })

  it.each([
    ['search', 'multi_day'],
    ['partner', null],
    ['direct', 'short_stay'],
  ] as const)('[AC-2] counts class %s with segment %s', async (referrerClass, segment) => {
    await recordOrderSubmit('2026-11-03', referrerClass, segment)
    expect(await rows()).toEqual([{ day: '2026-11-03', referrer_class: referrerClass, segment, order_submits: '1' }])
  })

  it.each([
    ['facebook', 'multi_day', 'daily_funnels_referrer_check'],
    ['search', 'vip', 'daily_funnels_segment_check'],
    ['search', 'none', 'daily_funnels_segment_check'],
  ])('[AC-2] the database refuses class %s with segment %s and changes no row', async (referrerClass, segment, constraint) => {
    await recordOrderSubmit('2026-11-03', 'search', 'multi_day')
    const before = await rows()
    const error = await failure(pool.query(`select analytics.record_order_submit('2026-11-03', $1, $2)`, [referrerClass, segment]))
    expect(error).toMatchObject({ code: '23514', constraint })
    expect(await rows()).toEqual(before)
    const direct = await failure(pool.query(
      `insert into analytics.daily_funnels (day, referrer_class, segment, order_submits) values ('2026-11-04', $1, $2, 1)`,
      [referrerClass, segment],
    ))
    expect(direct).toMatchObject({ code: '23514', constraint })
    expect(await rows()).toEqual(before)
  })

  it('[AC-2] the use case refuses a bad value before the database and changes no row', async () => {
    await expect(recordOrderSubmit('2026-11-03', 'facebook' as never, 'multi_day')).rejects.toThrow('referrer class')
    await expect(recordOrderSubmit('2026-11-03', 'search', 'vip' as never)).rejects.toThrow('segment')
    expect(await rows()).toEqual([])
  })

  it('[AC-3] one submit adds one for the day, the second makes two in the same row', async () => {
    await recordOrderSubmit('2026-11-03', 'search', 'multi_day')
    expect(await rows()).toEqual([{ day: '2026-11-03', referrer_class: 'search', segment: 'multi_day', order_submits: '1' }])
    await recordOrderSubmit('2026-11-03', 'search', 'multi_day')
    expect(await rows()).toEqual([{ day: '2026-11-03', referrer_class: 'search', segment: 'multi_day', order_submits: '2' }])
  })

  it('[AC-4] two days count in two rows', async () => {
    await recordOrderSubmit('2026-11-03', 'search', 'multi_day')
    await recordOrderSubmit('2026-11-04', 'search', 'multi_day')
    const found = await rows()
    expect(found.map(r => [r.day, r.order_submits])).toEqual([['2026-11-03', '1'], ['2026-11-04', '1']])
  })

  it('[AC-4] an absent segment and multi_day count in two rows, and an absent segment counts into one row', async () => {
    await recordOrderSubmit('2026-11-03', 'search', null)
    await recordOrderSubmit('2026-11-03', 'search', 'multi_day')
    await recordOrderSubmit('2026-11-03', 'search', null)
    const found = await rows()
    expect(found).toHaveLength(2)
    expect(found.find(r => r.segment === null)?.order_submits).toBe('2')
    expect(found.find(r => r.segment === 'multi_day')?.order_submits).toBe('1')
  })

  it('[AC-6] ten calls at the same moment give ten', async () => {
    await Promise.all(Array.from({ length: 10 }).map(() => recordOrderSubmit('2026-11-03', 'search', 'multi_day')))
    expect(await rows()).toEqual([{ day: '2026-11-03', referrer_class: 'search', segment: 'multi_day', order_submits: '10' }])
  })

  it('[AC-6] ten parallel calls with an absent segment give ten in one row', async () => {
    await Promise.all(Array.from({ length: 10 }).map(() => recordOrderSubmit('2026-11-03', 'direct', null)))
    expect(await rows()).toEqual([{ day: '2026-11-03', referrer_class: 'direct', segment: null, order_submits: '10' }])
  })
})
