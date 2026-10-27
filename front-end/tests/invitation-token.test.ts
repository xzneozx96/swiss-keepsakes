import { beforeEach, describe, expect, it, vi } from 'vitest'

import { captureInvitations, dropInvitationToken, heldInvitationToken, subscribeInvitationToken, takeInvitationFromAddress, takeInvitationFromHash } from '@/features/stores/lib/invitation-token'

const token = 'abcDEF123_-abcDEF123_-abcDEF123_-abcDEF123_-xyz'

beforeEach(() => {
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
})

describe('[E2.3][S8] the invitation token leaves the address', () => {
  it('moves the token into sessionStorage and returns the address without it', () => {
    expect(takeInvitationFromHash('/store/onboarding', `#invitation=${token}`)).toBe('')
    expect(heldInvitationToken()).toBe(token)
  })

  it('keeps every other parameter', () => {
    expect(takeInvitationFromHash('/store/onboarding', `#a=1&invitation=${token}&b=2`)).toBe('#a=1&b=2')
  })

  it('leaves an address with no token alone', () => {
    expect(takeInvitationFromHash('/store/onboarding', '')).toBeUndefined()
    expect(takeInvitationFromHash('/store/onboarding', '#x=1')).toBeUndefined()
    expect(heldInvitationToken()).toBeUndefined()
  })

  it('does not keep an empty token', () => {
    expect(takeInvitationFromHash('/store/onboarding', '#invitation=')).toBe('')
    expect(heldInvitationToken()).toBeUndefined()
  })

  it('replaces the browser address in place, so the token is in no history entry', () => {
    const entries = window.history.length

    window.history.replaceState(null, '', `/store/onboarding#invitation=${token}`)
    takeInvitationFromAddress()

    expect(window.location.href).not.toContain(token)
    expect(window.location.hash).toBe('')
    expect(window.history.length).toBe(entries)
    expect(heldInvitationToken()).toBe(token)
  })

  it('keeps the path and the query when it cleans the address', () => {
    window.history.replaceState(null, '', `/store/onboarding?a=1#invitation=${token}&x=1`)
    takeInvitationFromAddress()

    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/store/onboarding?a=1#x=1')
  })

  it('ignores a token in the query, which is not where the link puts it', () => {
    expect(takeInvitationFromHash('/store/onboarding', '')).toBeUndefined()
    window.history.replaceState(null, '', `/store/onboarding?invitation=${token}`)
    takeInvitationFromAddress()

    expect(heldInvitationToken()).toBeUndefined()
  })

  it('decodes a percent-encoded token', () => {
    expect(takeInvitationFromHash('/store/onboarding', '#invitation=a%2Bb%2F')).toBe('')
    expect(heldInvitationToken()).toBe('a+b/')
  })

  it('forgets the token on request', () => {
    takeInvitationFromHash('/store/onboarding', `#invitation=${token}`)
    dropInvitationToken()

    expect(heldInvitationToken()).toBeUndefined()
  })

  it('[E2.4][AC02] takes the token off the M01 address too, and keeps it out of the address', () => {
    expect(takeInvitationFromHash('/invitation', `#invitation=${token}`)).toBe('')
    expect(heldInvitationToken()).toBe(token)
  })

  it('captures a token on A02 and M01 only', () => {
    expect(takeInvitationFromHash('/admin', `#invitation=${token}`)).toBeUndefined()
    expect(takeInvitationFromHash('/sign-in', `#invitation=${token}`)).toBeUndefined()
    expect(heldInvitationToken()).toBeUndefined()
  })

  it('drops only the token it is told to, so a newer link survives', () => {
    takeInvitationFromHash('/store/onboarding', `#invitation=${token}-newer`)
    dropInvitationToken(token)

    expect(heldInvitationToken()).toBe(`${token}-newer`)
    dropInvitationToken(`${token}-newer`)
    expect(heldInvitationToken()).toBeUndefined()
  })

  it('tells a subscriber when a token is held or dropped', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeInvitationToken(listener)

    takeInvitationFromHash('/store/onboarding', `#invitation=${token}`)
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
      window.history.replaceState(null, '', `/store/onboarding#invitation=${token}`)
      window.dispatchEvent(new PopStateEvent('popstate'))

      expect(seenByRouter).toEqual([''])
      expect(heldInvitationToken()).toBe(token)
    }
    finally {
      window.removeEventListener('popstate', routerListener)
      stop()
    }
  })

  it('also takes it on hashchange, and stops when told to', () => {
    const stop = captureInvitations()

    window.history.replaceState(null, '', `/store/onboarding#invitation=${token}`)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    expect(window.location.hash).toBe('')
    stop()
    dropInvitationToken()
    window.history.replaceState(null, '', `/store/onboarding#invitation=${token}`)
    window.dispatchEvent(new PopStateEvent('popstate'))

    expect(heldInvitationToken()).toBeUndefined()
  })
})

describe('[E3.4] a newer link opened in a tab that already holds a token', () => {
  it.each(['popstate', 'hashchange'])('replaces the held token on %s', (type) => {
    const stop = captureInvitations()

    try {
      sessionStorage.setItem('sk.invitationToken', 'A')
      window.history.pushState(null, '', '/store/onboarding#invitation=B')
      window.dispatchEvent(type === 'popstate' ? new PopStateEvent('popstate') : new HashChangeEvent('hashchange'))

      expect(heldInvitationToken()).toBe('B')
      expect(window.location.hash).toBe('')
    }
    finally {
      stop()
    }
  })
})
