import { useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'

import { useDemoActions } from '@/features/demo'
import { clearGuestData } from '@/features/demo/store'

/**
 * Sends a visitor the API found signed out (a 401) to sign-in, which comes back to `returnTo`. The app may still
 * think the guest is signed in, from a session that ended while the tab was open, and the sign-in screen
 * steps straight back to `returnTo` for a signed-in guest, which would 401 again. So the app is marked signed out
 * first, with what a session end clears.
 */
export function useGoToSignIn(returnTo: string) {
  const navigate = useNavigate()
  const { update } = useDemoActions()

  return useCallback(() => {
    update(s => (s.data.signedInGuestId === null ? s : clearGuestData(s)))
    void navigate({ to: '/sign-in', search: { returnTo }, replace: true })
  }, [update, navigate, returnTo])
}
