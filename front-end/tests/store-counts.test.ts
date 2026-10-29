import type { AdminStore } from '@sk/api-contract'

import { describe, expect, it } from 'vitest'

import { countStores } from '@/features/stores/lib/store-counts'

function store(status: AdminStore['status'], invitation: AdminStore['invitation']): AdminStore {
  return { id: '0198a000-0000-7000-8000-000000000001', slug: 's', name: 'S', status, defaultLanguage: 'en', createdAt: '2026-10-20T08:00:00.000Z', invitation, conditions: { 'store-information': 'met', 'payment-account': 'pending', 'catalogue': 'pending', 'policies': 'pending' } }
}

const at = '2026-10-29T10:00:00.000Z'

describe('[E2.3][S8] the figures of A01\'s tiles', () => {
  it('counts every store, the ones whose Owner has not accepted, the onboarding ones and the live ones', () => {
    const counts = countStores([
      store('invited', { email: 'a@example.ch', state: 'open', expiresAt: at }),
      store('invited', { email: 'b@example.ch', state: 'expired', expiresAt: at }),
      store('invited', { email: 'c@example.ch', state: 'revoked', expiresAt: at }),
      store('onboarding', { email: 'd@example.ch', state: 'accepted', expiresAt: at }),
      store('live', { email: 'e@example.ch', state: 'accepted', expiresAt: at }),
      store('suspended', null),
    ])

    expect(counts).toEqual({ total: 6, waiting: 2, onboarding: 1, live: 1 })
  })

  it('counts nothing for no store', () => {
    expect(countStores([])).toEqual({ total: 0, waiting: 0, onboarding: 0, live: 0 })
  })
})
