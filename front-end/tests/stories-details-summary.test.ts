import { describe, expect, it } from 'vitest'

import { interestsSummary, staySummary } from '@/features/stories/lib/details-summary'
import { en } from '@/i18n/en'

const t = (key: keyof typeof en) => en[key]

describe('[E4.3][AC30] the closed summaries of the Details cards', () => {
  it('[E4.3][AC30] AC-5 stay summaries read Short stay, Multi-day and Both', () => {
    expect((['short_stay', 'multi_day', 'both'] as const).map(tag => staySummary(t, tag))).toEqual(['Short stay', 'Multi-day', 'Both'])
  })

  it('[E4.3][AC30] AC-5 the interests summary lists the chosen labels in the fixed order, or None', () => {
    expect(interestsSummary(t, [])).toBe('None')
    expect(interestsSummary(t, ['local-activities', 'food-drink'])).toBe('Food and drink, Local activities')
  })
})
