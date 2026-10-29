import { apiEnabled } from '@/lib/api-mode'
import { useMe } from '../api/queries'
import { currentStore } from '../lib/current-store'

/**
 * What `/store` shows: the Owner of a store that is not open yet belongs on Open your store, and everyone else,
 * including a person whose `GET /api/me` failed, gets the shell, whose own screens handle sign-in and errors.
 */
export function useStoreGate(): 'checking' | 'onboarding' | 'shell' {
  const me = useMe(apiEnabled)

  if (!apiEnabled)
    return 'shell'
  if (me.isPending)
    return 'checking'
  const current = currentStore(me.data)

  return current?.role === 'owner' && (current.status === 'onboarding' || current.status === 'invited') ? 'onboarding' : 'shell'
}
