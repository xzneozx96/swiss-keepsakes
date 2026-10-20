import { describe, expect, it, vi } from 'vitest'

import { clearGoogleReturnFailure, googleReturnAddress, googleReturnFailed, takeGoogleReturn } from '@/features/auth/lib/google-return'

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

  it('carries the return path through, and only an in-app one', () => {
    expect(
      googleReturnAddress({ pathname: '/sign-in', search: '?returnTo=%2Fcart%2Freview&error=access_denied' }),
    ).toBe('/#/sign-in?returnTo=%2Fcart%2Freview&error=access_denied')
    expect(
      googleReturnAddress({ pathname: '/sign-in', search: '?returnTo=%2F%2Fevil.example&error=x' }),
    ).toBe('/#/sign-in?returnTo=%2Faccount&error=x')
  })

  it('refuses a path that replaceState would take for another origin', () => {
    expect(
      googleReturnAddress({ pathname: '//evil.example/sign-in', search: '?error=x' }),
    ).toBeUndefined()
  })

  it('starts the app even when replaceState throws', () => {
    window.history.pushState(null, '', '/sign-in?error=access_denied')
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => {
      throw new DOMException('refused', 'SecurityError')
    })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => takeGoogleReturn()).not.toThrow()
    vi.restoreAllMocks()
    window.history.pushState(null, '', '/')
  })

  it('remembers a failed return after the error has left the address, until the guest acts', () => {
    window.history.pushState(null, '', '/sign-in?returnTo=%2Fcart&error=access_denied')
    takeGoogleReturn()

    expect(window.location.hash).toBe('#/sign-in?returnTo=%2Fcart&error=access_denied')
    expect(googleReturnFailed()).toBe(true)
    clearGoogleReturnFailure()
    expect(googleReturnFailed()).toBe(false)
    window.history.pushState(null, '', '/')
  })

  it('leaves every other address alone', () => {
    expect(googleReturnAddress({ pathname: '/', search: '?error=x' })).toBeUndefined()
    expect(googleReturnAddress({ pathname: '/account', search: '' })).toBeUndefined()
  })
})
