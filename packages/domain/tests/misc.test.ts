import { describe, expect, it } from 'vitest'

import * as payments from '../src/payments'
import * as reporting from '../src/reporting'
import * as requests from '../src/requests'

describe('[E1.2] payments/duplicate', () => {
  const at = '2026-10-19T10:00:00Z'
  const recorded = [{ status: 'succeeded', amount: 5000, at }, { status: 'failed', amount: 7000, at }]

  it('finds a repeat of the same amount inside ten minutes', () => {
    expect(payments.findDuplicatePayment(recorded, 5000, '2026-10-19T10:09:00Z')).toBe(recorded[0])
  })

  it('ignores a later repeat, another amount and a failed payment', () => {
    expect(payments.findDuplicatePayment(recorded, 5000, '2026-10-19T10:11:00Z')).toBeUndefined()
    expect(payments.findDuplicatePayment(recorded, 4000, at)).toBeUndefined()
    expect(payments.findDuplicatePayment(recorded, 7000, at)).toBeUndefined()
  })
})

describe('[E1.2] reporting/analytics', () => {
  it('compares the last 7 days with the 7 before', () => {
    expect(reporting.periodRanges('7d', '2026-10-19')).toEqual({
      current: { start: '2026-10-13', end: '2026-10-19' },
      previous: { start: '2026-10-06', end: '2026-10-12' },
    })
  })

  it('clips the previous month to its last day', () => {
    expect(reporting.periodRanges('month', '2026-03-31').previous).toEqual({ start: '2026-02-01', end: '2026-02-28' })
  })

  it('shows a change as a signed percent with a tone, and nothing when the previous value is 0', () => {
    expect(reporting.deltaOf(110, 100, 'up', 'en-CH')).toEqual({ delta: '+10%', direction: 'up', tone: 'good' })
    expect(reporting.deltaOf(90, 100, 'up', 'en-CH')).toMatchObject({ direction: 'down', tone: 'bad' })
    expect(reporting.deltaOf(5, 0, 'up', 'en-CH')).toEqual({ delta: '', direction: 'none', tone: 'neutral' })
  })

  it('finds the Monday of a week', () => {
    expect(reporting.mondayOf('2026-10-25')).toBe('2026-10-19')
    expect(reporting.mondayOf('2026-10-19')).toBe('2026-10-19')
  })
})

describe('[E1.2] reporting/periods', () => {
  it('compares a custom or standard range with the same number of days before it', () => {
    const { current, previous } = reporting.salesRanges('7d', '2026-10-19', '10:00', '2026-01-01', null)

    expect(current).toEqual({ start: '2026-10-13', end: '2026-10-19' })
    expect(previous).toEqual({ start: '2026-10-06', end: '2026-10-12' })
    expect(reporting.salesRanges('all', '2026-10-19', '10:00', '2026-01-01', null).previous).toBeNull()
  })

  it('counts days inclusively and picks the bucket size', () => {
    expect(reporting.dayCount({ start: '2026-10-13', end: '2026-10-19' })).toBe(7)
    expect(reporting.bucketOf({ start: '2026-10-19', end: '2026-10-19' })).toBe('hour')
    expect(reporting.bucketOf({ start: '2026-01-01', end: '2026-12-31' })).toBe('month')
  })
})

describe('[E1.2] requests/answers', () => {
  const question = { id: 'q1', text: { en: 'Pick' }, type: 'single', required: true, options: [{ id: 'a', label: { en: 'Alpha', de: 'Alfa' } }] } as unknown as requests.AdviceQuestion

  it('tells an answered question from an empty one', () => {
    expect(requests.isAnswered(undefined)).toBe(false)
    expect(requests.isAnswered('  ')).toBe(false)
    expect(requests.isAnswered([])).toBe(false)
    expect(requests.isAnswered(0)).toBe(true)
  })

  it('shows the option label in the guest language', () => {
    expect(requests.displayAnswer(question, 'a', 'de', d => d)).toBe('Alfa')
  })

  it('checks the shape of an email', () => {
    expect(requests.looksLikeEmail(' anna@example.ch ')).toBe(true)
    expect(requests.looksLikeEmail('anna@example')).toBe(false)
  })
})
