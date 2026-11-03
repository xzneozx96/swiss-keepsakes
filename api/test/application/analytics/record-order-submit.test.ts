import { describe, expect, it, vi } from 'vitest'
import { InvalidOrderSubmit, makeRecordOrderSubmit } from '../../../src/modules/analytics/index.ts'

function setup() {
  const countOrderSubmit = vi.fn(async () => {})
  return { countOrderSubmit, recordOrderSubmit: makeRecordOrderSubmit({ funnels: { countOrderSubmit } }) }
}

describe('[E8.7][AC37][AC60] recordOrderSubmit', () => {
  it.each([
    ['search', 'multi_day'],
    ['partner', null],
    ['direct', 'short_stay'],
    ['social', null],
    ['other', 'multi_day'],
  ] as const)('[AC-2] counts class %s with segment %s', async (referrerClass, segment) => {
    const { countOrderSubmit, recordOrderSubmit } = setup()
    await recordOrderSubmit('2026-11-03', referrerClass, segment)
    expect(countOrderSubmit).toHaveBeenCalledExactlyOnceWith('2026-11-03', referrerClass, segment)
  })

  it.each([
    ['facebook', 'multi_day'],
    ['search', 'vip'],
    ['search', 'none'],
    ['search', 'day_trip'],
    ['', null],
    ['Search', null],
  ])('[AC-2] refuses class %j with segment %j and touches nothing', async (referrerClass, segment) => {
    const { countOrderSubmit, recordOrderSubmit } = setup()
    await expect(recordOrderSubmit('2026-11-03', referrerClass as never, segment as never)).rejects.toBeInstanceOf(InvalidOrderSubmit)
    expect(countOrderSubmit).not.toHaveBeenCalled()
  })

  it.each(['2026-02-30', '2026-13-01', '03.11.2026', '2026-11-03T10:00:00Z', '2026-1-3', '', 'today'])(
    '[AC-2] refuses the day %j and touches nothing',
    async (day) => {
      const { countOrderSubmit, recordOrderSubmit } = setup()
      await expect(recordOrderSubmit(day, 'search', null)).rejects.toBeInstanceOf(InvalidOrderSubmit)
      expect(countOrderSubmit).not.toHaveBeenCalled()
    },
  )

  it('[AC-2] accepts a leap day', async () => {
    const { countOrderSubmit, recordOrderSubmit } = setup()
    await recordOrderSubmit('2028-02-29', 'search', null)
    expect(countOrderSubmit).toHaveBeenCalledOnce()
  })

  it('[AC-5] takes only a day, a referrer class and a segment', () => {
    const { recordOrderSubmit } = setup()
    expect(recordOrderSubmit.length).toBe(3)
  })

  it('[AC-5] passes nothing but those three values on', async () => {
    const { countOrderSubmit, recordOrderSubmit } = setup()
    await recordOrderSubmit('2026-11-03', 'search', 'multi_day')
    expect(countOrderSubmit.mock.calls[0]).toHaveLength(3)
  })
})
