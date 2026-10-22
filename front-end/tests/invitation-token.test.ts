import { beforeEach, describe, expect, it, vi } from 'vitest'

import { captureInvitations, dropInvitationToken, heldInvitationToken, subscribeInvitationToken, takeInvitationFromAddress, takeInvitationFromHash } from '@/features/stores/lib/invitation-token'

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

  it('captures a token on A02 only', () => {
    expect(takeInvitationFromHash(`#/admin?invitation=${token}`)).toBeUndefined()
    expect(takeInvitationFromHash(`#/sign-in?invitation=${token}`)).toBeUndefined()
    expect(heldInvitationToken()).toBeUndefined()
  })

  it('drops only the token it is told to, so a newer link survives', () => {
    takeInvitationFromHash(`#/store/onboarding?invitation=${token}-newer`)
    dropInvitationToken(token)

    expect(heldInvitationToken()).toBe(`${token}-newer`)
    dropInvitationToken(`${token}-newer`)
    expect(heldInvitationToken()).toBeUndefined()
  })

  it('tells a subscriber when a token is held or dropped', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeInvitationToken(listener)

    takeInvitationFromHash(`#/store/onboarding?invitation=${token}`)
    dropInvitationToken()
    unsubscribe()
    dropInvitationToken()

    expect(listener).toHaveBeenCalledTimes(2)
  })
})

describe('[E2.3][S8] a link opened in a tab that is already on A02', () => {
  it('takes the token out of the address in a popstate listener that runs before one added later, as the router\'s is', () => {
    const stop = captureInvitations()
    const seenByRouter: string[] = []
    const routerListener = () => seenByRouter.push(window.location.hash)

    window.addEventListener('popstate', routerListener)
    try {
      window.history.replaceState(null, '', `/#/store/onboarding?invitation=${token}`)
      window.dispatchEvent(new PopStateEvent('popstate'))

      expect(seenByRouter).toEqual(['#/store/onboarding'])
      expect(heldInvitationToken()).toBe(token)
    }
    finally {
      window.removeEventListener('popstate', routerListener)
      stop()
    }
  })

  it('also takes it on hashchange, and stops when told to', () => {
    const stop = captureInvitations()

    window.history.replaceState(null, '', `/#/store/onboarding?invitation=${token}`)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    expect(window.location.hash).toBe('#/store/onboarding')
    stop()
    dropInvitationToken()
    window.history.replaceState(null, '', `/#/store/onboarding?invitation=${token}`)
    window.dispatchEvent(new PopStateEvent('popstate'))

    expect(heldInvitationToken()).toBeUndefined()
  })
})
