import { describe, expect, it } from 'vitest'

import { adjacentStep, blockers, skippable, STEP_ORDER } from '@/features/stores/lib/onboarding-steps'

describe('onboarding step rules [E2.16][E2.3]', () => {
  it('lists the four conditions and then the opening', () => {
    expect(STEP_ORDER).toEqual(['store-information', 'payment-account', 'catalogue', 'policies', 'open'])
  })

  it('moves to the next and previous step and stops at both ends', () => {
    expect(adjacentStep('policies', 1)).toBe('open')
    expect(adjacentStep('open', 1)).toBe('open')
    expect(adjacentStep('store-information', -1)).toBe('store-information')
    expect(adjacentStep('catalogue', -1)).toBe('payment-account')
  })

  it('names the conditions that are not met, in API order', () => {
    expect(blockers([
      { key: 'store-information', state: 'met' },
      { key: 'payment-account', state: 'pending' },
      { key: 'catalogue', state: 'unmet' },
      { key: 'policies', state: 'pending' },
    ])).toEqual(['payment-account', 'catalogue', 'policies'])
    expect(blockers([
      { key: 'store-information', state: 'met' },
      { key: 'payment-account', state: 'met' },
      { key: 'catalogue', state: 'met' },
      { key: 'policies', state: 'met' },
    ])).toEqual([])
  })

  it('lets every step but the store information be skipped until it is met', () => {
    expect(skippable('pending', 'catalogue')).toBe(true)
    expect(skippable('met', 'policies')).toBe(false)
    expect(skippable('unmet', 'store-information')).toBe(false)
  })
})
