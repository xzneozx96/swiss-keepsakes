import { afterEach, describe, expect, it } from 'vitest'

import { clearGoogleReturnFailure, googleReturnFailed, rememberGoogleReturnFailure } from '@/features/auth/lib/google-return'

describe('[E3.4] a failed Google sign-in is remembered after the error leaves the address', () => {
  afterEach(clearGoogleReturnFailure)

  it('starts without a failure', () => {
    expect(googleReturnFailed()).toBe(false)
  })

  it('remembers the failure until the guest acts', () => {
    rememberGoogleReturnFailure()
    expect(googleReturnFailed()).toBe(true)
    clearGoogleReturnFailure()
    expect(googleReturnFailed()).toBe(false)
  })
})
