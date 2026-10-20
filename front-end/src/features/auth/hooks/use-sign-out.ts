import { toast } from '@heroui/react'
import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { useDemoActions } from '@/features/demo'
import { clearGuestData } from '@/features/demo/store'
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
 */
export function useSignOut() {
  const { update } = useDemoActions()
  const { t } = useLocale()
  const [pending, setPending] = useState(false)

  const signOut = async () => {
    if (pending)
      return
    setPending(true)
    try {
      if (apiEnabled && !(await endSession())) {
        toast.danger(t('auth.account.signOutFailed'))

        return
      }
      update(s => (apiEnabled ? clearGuestData(s, true) : { ...s, data: { ...s.data, signedInGuestId: null } }))
    }
    finally {
      setPending(false)
    }
  }

  return { signOut: () => void signOut(), pending }
}
