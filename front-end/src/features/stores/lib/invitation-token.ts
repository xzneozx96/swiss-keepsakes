import { readSessionStored, removeSessionStored, writeSessionStored } from '@/lib/storage'
import { INVITATION_PARAM, ONBOARDING_PATH } from './search-params'

const TOKEN_KEY = 'sk.invitationToken'
const LEADING_HASH = /^#/

const listeners = new Set<() => void>()

function tokenChanged() {
  for (const listener of listeners)
    listener()
}

/** For `useSyncExternalStore`: a screen that is already open learns that a link was opened in its tab. */
export function subscribeInvitationToken(listener: () => void) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

/**
 * Moves the invitation token from an address to `sessionStorage` and returns the address without it. It
 * returns undefined when the address holds no token, or is not A02: only A02's link carries one. Only
 * `sessionStorage` keeps the token: it lives as long as the tab, so the sign-in redirect and Google's round trip
 * find it again, and it reaches no history entry, no `returnTo` and no other tab.
 */
export function takeInvitationFromHash(hash: string): string | undefined {
  const [path = '', query = ''] = hash.replace(LEADING_HASH, '').split('?')

  if (path !== ONBOARDING_PATH)
    return undefined
  const params = new URLSearchParams(query)
  const token = params.get(INVITATION_PARAM)

  if (token === null)
    return undefined
  params.delete(INVITATION_PARAM)
  if (token && writeSessionStored(TOKEN_KEY, token))
    tokenChanged()

  return `#${path}${params.size > 0 ? `?${params}` : ''}`
}

/** Runs before the router starts, so the token is out of the address before any redirect. The app starts either way. */
export function takeInvitationFromAddress() {
  try {
    const { pathname, search, hash } = window.location
    const clean = takeInvitationFromHash(hash)

    if (clean !== undefined)
      window.history.replaceState(window.history.state, '', `${pathname}${search}${clean}`)
  }
  catch (error) {
    console.error('The invitation address could not be cleaned', error)
  }
}

/**
 * Takes the token out of the address at start and whenever the address changes in an open tab. Call it before
 * `createRouter`: the router listens to `popstate` too, and the listener added first runs first, so the router
 * reads the address with no token in it. `hashchange` follows `popstate` and covers a browser that sends only it.
 */
export function captureInvitations(): () => void {
  takeInvitationFromAddress()
  window.addEventListener('popstate', takeInvitationFromAddress)
  window.addEventListener('hashchange', takeInvitationFromAddress)

  return () => {
    window.removeEventListener('popstate', takeInvitationFromAddress)
    window.removeEventListener('hashchange', takeInvitationFromAddress)
  }
}

export function heldInvitationToken(): string | undefined {
  return readSessionStored(TOKEN_KEY)
}

/** Forgets the token. With `only`, it forgets that token alone, so a newer link opened meanwhile survives. */
export function dropInvitationToken(only?: string) {
  if (only !== undefined && heldInvitationToken() !== only)
    return
  removeSessionStored(TOKEN_KEY)
  tokenChanged()
}
