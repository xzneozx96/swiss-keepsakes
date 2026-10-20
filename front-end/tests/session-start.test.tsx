import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { followSession } from '@/features/auth/lib/session-sync'
import { startDemo } from '@/features/demo/data-client'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(null)))
})

describe('[E2.1] a browser that finds no session at start', () => {
  it('leaves what it saved alone: no store write after first paint, and the cart and saved gifts stay', async () => {
    const demo = startDemo()

    await demo.ready
    demo.store.update(s => ({
      ...s,
      data: { ...s.data, orders: [], favouriteProductIds: ['p-saved'] },
    }))
    const before = demo.store.getState()

    followSession(demo.store)
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(demo.store.getState()).toBe(before)
  })
})
