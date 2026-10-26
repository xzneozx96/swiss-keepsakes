import { describe, expect, it } from 'vitest'

import { safeReturnTo } from '@/features/auth/lib/return-to'

describe('safeReturnTo', () => {
  it.each([
    ['/\\evil.com'],
    ['/%5Cevil.com'],
    ['/\t/evil.com'],
    ['/\n/evil.com'],
    ['//evil.com'],
    ['https://evil.com'],
    ['/sign-in?returnTo=/x'],
    ['/%2F%2Fevil.com'],
    ['/%73ign-in'],
    ['/Sign-in'],
    [undefined],
  ])('[E3.2] sends %j to /account', (value) => {
    expect(safeReturnTo(value)).toBe('/account')
  })

  it('[E3.2] keeps an in-app path with its query', () => {
    expect(safeReturnTo('/cart/review?x=1')).toBe('/cart/review?x=1')
  })
})
