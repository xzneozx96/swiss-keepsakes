import { describe, expect, it } from 'vitest'

import { googleReturnAddress } from '@/features/auth/lib/google-return'

describe('[E2.1] a failed Google sign-in comes back to /sign-in?error=<code>', () => {
  it('moves the error into the hash, where hash history reads it', () => {
    expect(
      googleReturnAddress({ pathname: '/sign-in', search: '?error=access_denied' }),
    ).toBe('/#/sign-in?error=access_denied')
  })

  it('encodes the code and keeps a base path', () => {
    expect(
      googleReturnAddress({ pathname: '/shop/sign-in', search: '?error=a%26b' }),
    ).toBe('/shop#/sign-in?error=a%26b')
  })

  it('moves a /sign-in without an error to the sign-in screen', () => {
    expect(googleReturnAddress({ pathname: '/sign-in', search: '' })).toBe('/#/sign-in')
  })

  it('leaves every other address alone', () => {
    expect(googleReturnAddress({ pathname: '/', search: '?error=x' })).toBeUndefined()
    expect(googleReturnAddress({ pathname: '/account', search: '' })).toBeUndefined()
  })
})
