import type { AdminStore } from '@sk/api-contract'

import { describe, expect, it } from 'vitest'

import { conditionsMet } from '@/features/stores/lib/conditions-met'

function store(overrides: Partial<AdminStore> = {}): AdminStore {
  return { id: '0198a000-0000-7000-8000-000000000001', slug: 's', name: 'S', status: 'onboarding', defaultLanguage: 'en', createdAt: '2026-10-20T08:00:00.000Z', invitation: null, paymentAccount: 'pending', ...overrides }
}

describe('[E2.15][E2.3] how many of the four conditions a store has met', () => {
  it('counts the store information for any store, and nothing else while the payment account is not met', () => {
    expect(conditionsMet(store())).toBe(1)
    expect(conditionsMet(store({ paymentAccount: 'unmet' }))).toBe(1)
  })

  it('adds the payment account once it is verified', () => {
    expect(conditionsMet(store({ paymentAccount: 'met' }))).toBe(2)
  })

  it('counts the store information as unmet for a blank name', () => {
    expect(conditionsMet(store({ name: '  ' }))).toBe(0)
  })
})
