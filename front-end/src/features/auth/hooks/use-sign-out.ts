import { toast } from '@heroui/react'

import { useLocale } from '@/contexts/locale-context'
import { useDemoActions } from '@/features/demo'
import { loadNeonAuth, neonAuthUrl } from '../lib/neon-auth'

async function endNeonSession(url: string): Promise<boolean> {
  try {
    const auth = await loadNeonAuth(url)
    const { error } = await auth.signOut()

    return !error
  }
  catch {
    return false
  }
}

/**
 * Account's Sign out. With Neon Auth it ends the session first, so a reload cannot sign the guest
 * back in. If that fails the guest stays signed in and is told.
 */
export function useSignOut() {
  const { update } = useDemoActions()
  const { t } = useLocale()

  const signOut = async () => {
    if (neonAuthUrl && !(await endNeonSession(neonAuthUrl))) {
      toast.danger(t('auth.account.signOutFailed'))

      return
    }
    update(s => ({ ...s, data: { ...s.data, signedInGuestId: null } }))
  }

  return () => void signOut()
}
