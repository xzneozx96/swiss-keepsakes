import { describe, expect, it } from 'vitest'

import { HIDDEN_UNTIL_READY } from '@/components/layout/nav-ready'
import { Route as StoreIndexRoute } from '@/routes/store/index'

describe('the merchant landing page', () => {
  it('sends /store to Keepsakes while Today is hidden until ready (owner, 04.11.2026)', () => {
    expect(HIDDEN_UNTIL_READY.has('/store')).toBe(true)
    const beforeLoad = StoreIndexRoute.options.beforeLoad as () => void

    expect(() => beforeLoad()).toThrow(expect.objectContaining({ options: expect.objectContaining({ to: '/store/products', replace: true }) }))
  })
})
