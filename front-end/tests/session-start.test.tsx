import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { followSession } from '@/features/auth/lib/session-sync'
import { startDemo } from '@/features/demo/data-client'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('fetch', async () => Response.json(null))
})

describe('[E2.1] a browser that finds no session at start', () => {
  it('drops the account data an earlier session left, and keeps the cart and saved gifts', async () => {
    const demo = startDemo()

    await demo.ready
    demo.store.update(s => ({
      ...s,
      data: { ...s.data, orders: [], guests: [], favouriteProductIds: ['p-saved'] },
    }))
    followSession(demo.store)

    await waitFor(() => expect(demo.store.getState().data.orders.length).toBeGreaterThan(0))
    expect(demo.store.getState().data.guests.length).toBeGreaterThan(0)
    expect(demo.store.getState().data.favouriteProductIds).toEqual(['p-saved'])
    expect(demo.store.getState().data.signedInGuestId).toBeNull()
  })
})
