import type { AdminStore } from '@sk/api-contract'

import { adminStoreSchema } from '@sk/api-contract'
import { describe, expect, it } from 'vitest'

import { conditionsMet } from '@/features/stores/lib/conditions-met'

const none = { 'store-information': 'unmet', 'payment-account': 'unmet', 'catalogue': 'unmet', 'policies': 'unmet' } as const

function store(conditions: Partial<AdminStore['conditions']> = {}): AdminStore {
  return { id: '0198a000-0000-7000-8000-000000000001', slug: 's', name: 'S', status: 'onboarding', defaultLanguage: 'en', createdAt: '2026-10-20T08:00:00.000Z', invitation: null, conditions: { ...none, ...conditions } }
}

describe('[E2.15][E2.3] how many of the four conditions a store has met', () => {
  it('counts the conditions the server marks met', () => {
    expect(conditionsMet(store())).toBe(0)
    expect(conditionsMet(store({ 'store-information': 'met' }))).toBe(1)
    expect(conditionsMet(store({ 'store-information': 'met', 'catalogue': 'met', 'policies': 'met' }))).toBe(3)
    expect(conditionsMet(store({ 'store-information': 'met', 'payment-account': 'met', 'catalogue': 'met', 'policies': 'met' }))).toBe(4)
  })

  it('counts pending like unmet', () => {
    expect(conditionsMet(store({ 'store-information': 'met', 'payment-account': 'pending', 'catalogue': 'pending', 'policies': 'pending' }))).toBe(1)
  })

  it('the contract accepts the four conditions and rejects a store without them', () => {
    const { conditions, ...rest } = store({ 'store-information': 'met' })

    expect(adminStoreSchema.parse({ ...rest, conditions }).conditions['store-information']).toBe('met')
    expect(adminStoreSchema.safeParse(rest).success).toBe(false)
  })
})
