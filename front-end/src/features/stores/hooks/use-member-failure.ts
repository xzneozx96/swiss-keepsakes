import { toast } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'

import { useLocale } from '@/contexts/locale-context'
import { queryKeys } from '@/features/data-client'
import { ApiProblem } from '@/features/data-client/errors'
import { listIsStale, memberProblemKey } from '../lib/member-problems'
import { SETTINGS_PATH } from '../lib/search-params'
import { useGoToSignIn } from './use-go-to-sign-in'

/**
 * What every M22 command does with a refusal: a session that ended (401) goes to sign-in and back to Settings, a
 * 404 or 409 reads the list again so it is never stale, and the rest is said in a toast. `toastIt: false` leaves the
 * message to the caller, as the invite form shows its own.
 */
export function useMemberFailure(storeId: string) {
  const { t } = useLocale()
  const queryClient = useQueryClient()
  const goToSignIn = useGoToSignIn(SETTINGS_PATH)

  return (error: Error, { toastIt = true }: { toastIt?: boolean } = {}) => {
    if (error instanceof ApiProblem && error.status === 401) {
      goToSignIn()

      return
    }
    if (listIsStale(error))
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.stores.members, storeId] })
    if (toastIt)
      toast.danger(t(memberProblemKey(error)))
  }
}
