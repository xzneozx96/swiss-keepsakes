import { beforeEach, describe, expect, it } from 'vitest'

import { dropInvitationToken, heldInvitationToken, takeInvitationFromAddress, takeInvitationFromHash } from '@/features/stores/lib/invitation-token'

const token = 'abcDEF123_-abcDEF123_-abcDEF123_-abcDEF123_-xyz'

beforeEach(() => {
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
})

describe('[E2.3][S8] the invitation token leaves the address', () => {
  it('moves the token into sessionStorage and returns the address without it', () => {
    expect(takeInvitationFromHash(`#/store/onboarding?invitation=${token}`)).toBe('#/store/onboarding')
    expect(heldInvitationToken()).toBe(token)
  })

  it('keeps every other parameter', () => {
    expect(takeInvitationFromHash(`#/store/onboarding?a=1&invitation=${token}&b=2`)).toBe('#/store/onboarding?a=1&b=2')
  })

  it('leaves an address with no token alone', () => {
    expect(takeInvitationFromHash('#/store/onboarding')).toBeUndefined()
    expect(heldInvitationToken()).toBeUndefined()
  })

  it('does not keep an empty token', () => {
    expect(takeInvitationFromHash('#/store/onboarding?invitation=')).toBe('#/store/onboarding')
    expect(heldInvitationToken()).toBeUndefined()
  })

  it('replaces the browser address in place, so the token is in no history entry', () => {
    const entries = window.history.length

    window.history.replaceState(null, '', `/#/store/onboarding?invitation=${token}`)
    takeInvitationFromAddress()

    expect(window.location.href).not.toContain(token)
    expect(window.location.hash).toBe('#/store/onboarding')
    expect(window.history.length).toBe(entries)
    expect(heldInvitationToken()).toBe(token)
  })

  it('forgets the token on request', () => {
    takeInvitationFromHash(`#/store/onboarding?invitation=${token}`)
    dropInvitationToken()

    expect(heldInvitationToken()).toBeUndefined()
  })
})
