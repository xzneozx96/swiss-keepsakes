import { toast } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { useDemoActions } from '@/features/demo'
import { clearGuestData } from '@/features/demo/store'
import { forgetStoresSession } from '@/features/stores/lib/forget-session'
import { apiEnabled } from '@/lib/api-mode'
import { authFetchOptions, loadAuthClient } from '../lib/auth-api'

async function endSession(): Promise<boolean> {
  try {
    const auth = await loadAuthClient()
    const { error } = await auth.signOut({ fetchOptions: authFetchOptions() })

    return !error
  }
  catch {
    return false
  }
}

/**
 * Account's Sign out. With the API it ends the session first, so a reload cannot sign the guest back
 * in. If that fails the guest stays signed in and is told. `pending` disables the button meanwhile.
 * `signOutThen` also runs a callback once the session has ended.
 */
export function useSignOut() {
  const { update } = useDemoActions()
  const queryClient = useQueryClient()
  const { t } = useLocale()
  const [pending, setPending] = useState(false)

  const signOut = async (onSignedOut?: () => void) => {
    if (pending)
      return
    setPending(true)
    try {
      if (apiEnabled && !(await endSession())) {
        toast.danger(t('auth.account.signOutFailed'))

        return
      }
      forgetStoresSession(queryClient)
      update(s => (apiEnabled ? clearGuestData(s) : { ...s, data: { ...s.data, signedInGuestId: null } }))
      onSignedOut?.()
    }
    finally {
      setPending(false)
    }
  }

  return {
    signOut: () => void signOut(),
    signOutThen: (onSignedOut: () => void) => void signOut(onSignedOut),
    pending,
  }
}
