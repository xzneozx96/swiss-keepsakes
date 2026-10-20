import type { NeonAuthClient } from './neon-auth-client'
import type { DemoStore } from '@/features/demo/store'

import { demoGuest } from '@/features/orders/seed'

/**
 * The branch's Neon Auth URL (D8). Set, guests sign in through Neon Auth. Unset, the demo signs
 * them in with its prototype codes, as before.
 */
export const neonAuthUrl = import.meta.env.VITE_NEON_AUTH_URL || undefined

let client: Promise<NeonAuthClient> | undefined

/** Neon's SDK, loaded on first use so demo mode never downloads it. A failed load is tried again next time. */
export function loadNeonAuth(url: string): Promise<NeonAuthClient> {
  client ??= import('./neon-auth-client').then(
    module => module.createNeonAuthClient(url),
    (error: unknown) => {
      client = undefined
      throw error
    },
  )

  return client
}

/**
 * The signed-in guest's JWT for `Authorization: Bearer`, or null. The SDK keeps it in memory and
 * fetches a new one shortly before it expires.
 */
export async function getAccessToken(): Promise<string | null> {
  if (!neonAuthUrl)
    return null
  const auth = await loadNeonAuth(neonAuthUrl)
  const { data } = await auth.getSession()

  return data?.session.token ?? null
}

/** What Neon Auth adds before the `#` when it sends the browser back from Google. */
const RETURN_PARAMS = ['neon_auth_session_verifier', 'error', 'error_description']

function dropReturnParams() {
  const address = new URL(window.location.href)

  if (!RETURN_PARAMS.some(name => address.searchParams.has(name)))
    return
  RETURN_PARAMS.forEach(name => address.searchParams.delete(name))
  window.history.replaceState(window.history.state, '', address.href)
}

/**
 * Who is signed in comes from the Neon Auth session cookie, never from the demo data this browser
 * saved. Until the account feature moves to the API, a session signs in the demo guest. When Neon
 * Auth cannot be reached, the guest starts signed out. Back from Google, the SDK first exchanges the
 * verifier in the address for the session, then the address is cleaned for the router.
 */
export async function restoreSession(store: DemoStore, url: string) {
  let signedIn = false

  try {
    const auth = await loadNeonAuth(url)
    const { data } = await auth.getSession()

    signedIn = data !== null
  }
  catch (error) {
    console.error('The Neon Auth session could not be read', error)
  }
  dropReturnParams()
  store.update(s => ({
    ...s,
    data: { ...s.data, signedInGuestId: signedIn ? demoGuest.id : null },
  }))
}
