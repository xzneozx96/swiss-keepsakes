import { readSessionStored, removeSessionStored, writeSessionStored } from '@/lib/storage'
import { INVITATION_PARAM } from './search-params'

const TOKEN_KEY = 'sk.invitationToken'
const LEADING_HASH = /^#/

/**
 * Moves the invitation token from an address to `sessionStorage` and returns the address without it. It
 * returns undefined when the address holds no token. Only `sessionStorage` keeps the token: it lives as long as
 * the tab, so the sign-in redirect and Google's round trip find it again, and it reaches no history entry, no
 * `returnTo` and no other tab.
 */
export function takeInvitationFromHash(hash: string): string | undefined {
  const [path = '', query = ''] = hash.replace(LEADING_HASH, '').split('?')
  const params = new URLSearchParams(query)
  const token = params.get(INVITATION_PARAM)

  if (token === null)
    return undefined
  params.delete(INVITATION_PARAM)
  if (token)
    writeSessionStored(TOKEN_KEY, token)

  return `#${path}${params.size > 0 ? `?${params}` : ''}`
}

/** Runs before the router starts, so the token is out of the address before any redirect. The app starts either way. */
export function takeInvitationFromAddress() {
  try {
    const { pathname, search, hash } = window.location
    const clean = takeInvitationFromHash(hash)

    if (clean !== undefined)
      window.history.replaceState(null, '', `${pathname}${search}${clean}`)
  }
  catch (error) {
    console.error('The invitation address could not be cleaned', error)
  }
}

export function heldInvitationToken(): string | undefined {
  return readSessionStored(TOKEN_KEY)
}

export function dropInvitationToken() {
  removeSessionStored(TOKEN_KEY)
}
